/**
 * 年間ランキングのデータ取得フック（EP-07 / 要求 1-5, 1-6, 1-7）。
 *
 * cms 側の `GET /api/rankings/latest?seasonId=&type=`（hub `docs/03-api-spec.md` 2章）は
 * まだ実装されていない（EP-16 と並行中のため想定内のギャップ。EP-05 の認証エンドポイントと同じ扱い）。
 * `rankings` コレクションは type ごとに `asOf` 降順で履歴を積む設計で、各明細行に
 * 前回比較用の `previousRank` を CMS 側があらかじめ入れて保存しているため、
 * 「対象 season + type で asOf 降順の先頭 1 件」を取得すれば
 * カスタムエンドポイントと同じ「前回比つき最新ランキング」が得られる。
 * EP-06 のハイライト面と同じパターンで、コレクション直接参照にフォールバックしている。
 */
import { useMemo } from 'react'

import { useList } from './hooks'
import { qk } from './keys'
import type { Ranking } from '../types/payload'

export type RankingType = Ranking['type']
export type RankingEntry = NonNullable<Ranking['entries']>[number]

/** ADR-014: ポイント算式は持たず CMS 入力値（value / valueLabel）をそのまま表示する */
export const RANKING_TYPE_LABELS: Record<RankingType, string> = {
  money: '賞金ランキング',
  points: 'ポイントランキング',
  rookie: '新人王ランキング',
  driving_distance: '平均飛距離',
  greens_in_regulation: 'パーオン率',
  sand_save: 'サンドセーブ率',
  putting: 'パット数',
  scoring_average: '平均ストローク',
}

/** 補-1-7-1: 部門別ランキングのセレクタ5種（新人王は別カテゴリのため含めない） */
export const STAT_CATEGORY_TYPES: RankingType[] = [
  'driving_distance',
  'greens_in_regulation',
  'sand_save',
  'putting',
  'scoring_average',
]

/** ランキング画面トップレベルの4カテゴリ（受け入れ基準: 4系統がセレクタから到達できる） */
export const RANKING_CATEGORIES = [
  { value: 'money', label: '賞金' },
  { value: 'points', label: 'ポイント' },
  { value: 'rookie', label: '新人王' },
  { value: 'stats', label: '部門別' },
] as const
export type RankingCategory = (typeof RANKING_CATEGORIES)[number]['value']

const sortEntries = (entries: RankingEntry[] | null | undefined): RankingEntry[] =>
  [...(entries ?? [])].sort((a, b) => a.rank - b.rank)

/**
 * 1-5〜1-7: 指定シーズン・種別の最新ランキング（前回比つき）。
 * `asOf` 降順で先頭 1 件を「最新」として扱う。
 */
export const useLatestRanking = (seasonId?: string, type?: RankingType) => {
  const query = useList<Ranking>(
    qk.rankings(seasonId ?? '', type ?? ''),
    'rankings',
    {
      where: seasonId && type ? { season: { equals: seasonId }, type: { equals: type } } : undefined,
      sort: '-asOf',
      limit: 1,
      depth: 2, // ranking -> entries.player -> photo
    },
    { enabled: Boolean(seasonId && type) },
  )
  const ranking = query.data?.docs?.[0]
  const entries = useMemo(() => sortEntries(ranking?.entries), [ranking])
  return { ...query, ranking, entries }
}

/**
 * 補-1-5-1「直近」タブ: 大会単位の獲得賞金を持つコレクションが無いため、
 * money 型の直近2スナップショット（asOf降順）の差分を「直近の獲得賞金」として近似する。
 * スナップショットが1件しか無いシーズンでは差分が取れないため空扱いにする。
 * （CMS にトーナメント単位の賞金明細を持たせられれば置き換えられるよう、この関数に隔離する）
 */
export const useRecentMoneyRanking = (seasonId?: string) => {
  const query = useList<Ranking>(
    qk.rankingsRecentMoney(seasonId ?? ''),
    'rankings',
    {
      where: seasonId ? { season: { equals: seasonId }, type: { equals: 'money' } } : undefined,
      sort: '-asOf',
      limit: 2,
      depth: 2,
    },
    { enabled: Boolean(seasonId) },
  )

  const entries = useMemo<Array<RankingEntry & { deltaValue: number }>>(() => {
    const docs = query.data?.docs ?? []
    if (docs.length < 2) return []
    const latest = sortEntries(docs[0].entries)
    const previous = new Map<number, RankingEntry>()
    for (const e of sortEntries(docs[1].entries)) {
      const pid = typeof e.player === 'number' ? e.player : e.player.id
      previous.set(pid, e)
    }
    return latest
      .map((e) => {
        const pid = typeof e.player === 'number' ? e.player : e.player.id
        const prev = previous.get(pid)
        return { ...e, deltaValue: e.value - (prev?.value ?? 0) }
      })
      .filter((e) => e.deltaValue > 0)
      .sort((a, b) => b.deltaValue - a.deltaValue)
  }, [query.data])

  return { ...query, entries, hasComparison: (query.data?.docs.length ?? 0) >= 2 }
}
