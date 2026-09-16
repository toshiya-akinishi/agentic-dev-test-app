/**
 * ニュース関連のデータ取得フック（EP-06 / 要求 1-9, 1-10, 1-11, 4-2）。
 * 画面からは必ずこのフック経由で取得する（AGENTS.md 3章）。
 */
import { and, or, type WhereInput } from '../api/query'
import { commaList, relId, uniqIds } from '../features/common'
import { flattenPages, useDoc, useInfiniteList, useList } from './hooks'
import { qk } from './keys'
import type { News, Round, Score } from '../types/payload'

/** 一覧のページサイズ（補-1-9-1: 無限スクロール 20 件/ページ） */
export const NEWS_PAGE_SIZE = 20

/** ホームの最新ニュース件数（補-1-11-1） */
export const HOME_NEWS_LIMIT = 5

/** お気に入り選手ニュースの件数（補-4-2-1） */
export const FAVORITE_NEWS_LIMIT = 5

export type NewsCategory = 'all' | 'tournament' | 'player' | 'announcement'

export const NEWS_CATEGORY_OPTIONS: Array<{ value: NewsCategory; label: string }> = [
  { value: 'all', label: 'すべて' },
  { value: 'tournament', label: '大会' },
  { value: 'player', label: '選手' },
  { value: 'announcement', label: 'お知らせ' },
]

export const newsCategoryLabel = (c: News['category']): string =>
  NEWS_CATEGORY_OPTIONS.find((o) => o.value === c)?.label ?? 'ニュース'

/**
 * 予約公開の除外（補-1-12-1）。`publishedAt <= 現在時刻` のみを一覧に出す。
 * queryFn 実行時の値で評価させたいので queryKey には含めない。
 */
const publishedOnly = (): WhereInput => ({
  publishedAt: { less_than_equal: new Date().toISOString() },
})

const categoryClause = (category?: NewsCategory): WhereInput | undefined =>
  category && category !== 'all' ? { category: { equals: category } } : undefined

/**
 * 補-1-11-1: ホームの最新ニュース。
 * `isPinned` を最上位、以降 `publishedAt` 降順で 5 件。
 */
export const useLatestNews = (limit: number = HOME_NEWS_LIMIT) =>
  useList<News>(qk.news({ scope: 'home-latest', limit }), 'news', {
    where: publishedOnly(),
    sort: '-isPinned,-publishedAt',
    limit,
    depth: 1,
  })

/**
 * 補-4-2-1: お気に入り選手のニュース。
 * `news.players` にお気に入り選手のいずれかが含まれる記事を新着順で最大 5 件。
 * お気に入り 0 件のときは発火させない（セクション自体を出さない: 補-4-2-2）。
 */
export const useFavoritePlayerNews = (
  playerIds: number[],
  limit: number = FAVORITE_NEWS_LIMIT,
) => {
  const ids = commaList(playerIds)
  return useList<News>(
    qk.news({ scope: 'favorite-players', players: ids, limit }),
    'news',
    {
      where: and(publishedOnly(), { players: { in: ids } }),
      sort: '-publishedAt',
      limit,
      depth: 1,
    },
    { enabled: playerIds.length > 0 },
  )
}

/**
 * 補-1-9-1: ニュース一覧（無限スクロール 20 件/ページ・新着順）。
 * `tournamentId` を渡すと「当該大会に紐づくニュース + 出場選手に紐づくニュース」に絞る。
 */
export const useNewsList = (opts: {
  category?: NewsCategory
  tournamentId?: string
  /** 大会の出場選手 ID（補-1-9-1 の「出場選手に紐づくニュース」） */
  entrantPlayerIds?: number[]
}) => {
  const entrants = opts.entrantPlayerIds ?? []
  const relatedClause: WhereInput | undefined = opts.tournamentId
    ? or(
        { tournament: { equals: opts.tournamentId } },
        entrants.length ? { players: { in: commaList(entrants) } } : undefined,
      )
    : undefined

  const query = useInfiniteList<News>(
    qk.news({
      scope: 'list',
      category: opts.category ?? 'all',
      tournament: opts.tournamentId ?? null,
      entrants: entrants.length ? commaList(entrants) : null,
    }),
    'news',
    {
      where: and(publishedOnly(), categoryClause(opts.category), relatedClause),
      sort: '-publishedAt',
      depth: 1,
    },
    { limit: NEWS_PAGE_SIZE },
  )

  return { ...query, items: flattenPages<News>(query.data) }
}

/** 1-10 / 補-1-10-1, 補-1-10-2: ニュース詳細。関連選手・関連大会も引くので depth 2 */
export const useNewsItem = (id: string | undefined) =>
  useDoc<News>(qk.newsItem(id ?? ''), 'news', id, 2)

/**
 * 補-1-9-1 の「出場選手」を求める。
 * 大会 → ラウンド → スコアの選手 ID を一意化して返す。
 * （EP-10 の `/api/leaderboard/:id` が入るまではコレクション参照で代替する）
 */
export const useTournamentEntrantIds = (tournamentId?: string): number[] => {
  const rounds = useList<Round>(
    qk.rounds(tournamentId ?? ''),
    'rounds',
    {
      where: { tournament: { equals: tournamentId } },
      sort: 'number',
      limit: 4,
      depth: 0,
    },
    { enabled: Boolean(tournamentId) },
  )

  const roundIds = (rounds.data?.docs ?? []).map((r) => r.id)

  const scores = useList<Score>(
    qk.leaderboard(tournamentId ?? '', { scope: 'entrants', rounds: commaList(roundIds) }),
    'scores',
    {
      where: { round: { in: commaList(roundIds) } },
      limit: 300,
      depth: 0,
      select: ['player'],
    },
    { enabled: roundIds.length > 0 },
  )

  return uniqIds(
    (scores.data?.docs ?? [])
      .map((s) => relId(s.player))
      .filter((x): x is number => typeof x === 'number'),
  )
}
