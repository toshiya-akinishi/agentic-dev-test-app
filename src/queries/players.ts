/**
 * 選手ガイド・マイ選手のデータ取得フック（EP-13 / T-13-1〜T-13-4, T-13-6 / 要求 4-1, 4-6, 4-7, 4-13, 4-14）。
 * 画面からは必ずこのフック経由で取得する（AGENTS.md 3章）。
 *
 * 補足（EP-10 が既に確認した既知の制約を踏襲）: `players` コレクションに かな（`reading`）
 * フィールドは存在しない（`src/types/payload.ts` の `Player` interface 参照）。そのため
 * 「50音順」は `name`（和名）を `localeCompare('ja')` で並べる近似で代替する。
 * かなフィールドが将来追加された場合は `sortPlayersByKana` だけを差し替えればよい。
 */
import { useMemo } from 'react'

import { commaList, relDoc, relId } from '../features/common'
import { normalizeForSearch } from '../features/guide/search'
import { listCollection, useCustom, useDoc, useList, useLiveQuery, type PaginatedResponse } from './hooks'
import { qk } from './keys'
import { useLatestRanking } from './rankings'
import type { Player, PlayerStory, Round, Score, Tournament, User } from '../types/payload'

/* ---------------- 一覧（T-13-1 / 4-7, 4-12） ---------------- */

/** 一覧・検索・並べ替えの対象は `isActive` の選手のみ（4-1 補足と同じ扱い） */
export const useActivePlayers = () =>
  useList<Player>(
    qk.players({ scope: 'guide-list' }),
    'players',
    { where: { isActive: { equals: true } }, sort: 'name', limit: 500, depth: 1 }, // player -> photo
  )

/** 選手一覧の検索（名前・英字表記の部分一致。件数が限られるため端末側で絞り込む） */
export const filterPlayers = (players: Player[], rawQuery: string): Player[] => {
  const q = normalizeForSearch(rawQuery)
  if (!q) return players
  return players.filter(
    (p) => normalizeForSearch(p.name).includes(q) || normalizeForSearch(p.nameEn).includes(q),
  )
}

export type PlayerListSort = 'kana' | 'ranking'

/** 50音順（近似）。かなフィールドが無いため和名の localeCompare で代替する（上記コメント参照） */
export const sortPlayersByKana = (players: Player[]): Player[] =>
  [...players].sort((a, b) => a.name.localeCompare(b.name, 'ja'))

/** ランキング順に使う「現行シーズンのポイントランキング」の 選手id→順位 マップ */
export const usePointsRankIndex = (seasonId?: string) => {
  const { entries, isLoading } = useLatestRanking(seasonId, 'points')
  const rankByPlayerId = useMemo(() => {
    const map = new Map<number, number>()
    for (const e of entries) {
      const pid = relId(e.player)
      if (typeof pid === 'number') map.set(pid, e.rank)
    }
    return map
  }, [entries])
  return { rankByPlayerId, isLoading }
}

/** ランキング順。ランキング未掲載の選手（新人・出場数不足等）は末尾へ和名順で並べる */
export const sortPlayersByRanking = (
  players: Player[],
  rankByPlayerId: Map<number, number>,
): Player[] =>
  [...players].sort((a, b) => {
    const ra = rankByPlayerId.get(a.id) ?? Number.POSITIVE_INFINITY
    const rb = rankByPlayerId.get(b.id) ?? Number.POSITIVE_INFINITY
    if (ra !== rb) return ra - rb
    return a.name.localeCompare(b.name, 'ja')
  })

/* ---------------- 詳細（T-13-2 / 4-7） ---------------- */

/** player -> photo / equipment[].photo / sponsors まで展開 */
export const usePlayer = (id: string | undefined) => useDoc<Player>(qk.player(id ?? ''), 'players', id, 2)

/**
 * 補-4-7-2: 今季成績サマリ（賞金順位/ポイント順位/平均スコア）。
 * ADR-014 によりポイントは算式を持たず CMS 入力の rankings をそのまま参照する。
 * 対象選手がランキング未掲載（出場数不足等）の場合は該当項目を「-」として扱う。
 */
export const usePlayerSeasonSummary = (seasonId: string | undefined, playerId: number | undefined) => {
  const money = useLatestRanking(seasonId, 'money')
  const points = useLatestRanking(seasonId, 'points')
  const scoringAverage = useLatestRanking(seasonId, 'scoring_average')

  const findEntry = (entries: typeof money.entries) =>
    entries.find((e) => relId(e.player) === playerId)

  return {
    isLoading: money.isLoading || points.isLoading || scoringAverage.isLoading,
    moneyRank: findEntry(money.entries)?.rank,
    pointsRank: findEntry(points.entries)?.rank,
    scoringAverageLabel: findEntry(scoringAverage.entries)?.valueLabel,
  }
}

/* ---------------- 成績タブ（T-13-2 / 4-7, 4-14） ---------------- */

export type PlayerTournamentResult = { tournament: Tournament; round: Round; score: Score }

/**
 * 選手起点の大会別最終成績。`scores` を player で引き、大会ごとに
 * ラウンド番号が最大の行（＝その大会での最終行）を代表値として使う
 * （`buildLeaderboardEntries` の「選手軸→大会軸」版）。
 */
export const usePlayerResults = (playerId: number | undefined) => {
  const query = useList<Score>(
    qk.playerResults(String(playerId ?? '')),
    'scores',
    { where: { player: { equals: playerId } }, sort: '-createdAt', limit: 300, depth: 2 },
    { enabled: Boolean(playerId) },
  )

  const results = useMemo<PlayerTournamentResult[]>(() => {
    const byTournament = new Map<number, PlayerTournamentResult>()
    for (const s of query.data?.docs ?? []) {
      const round = relDoc<Round>(s.round)
      if (!round) continue
      const tournament = relDoc<Tournament>(round.tournament)
      if (!tournament) continue
      const existing = byTournament.get(tournament.id)
      if (!existing || round.number > existing.round.number) {
        byTournament.set(tournament.id, { tournament, round, score: s })
      }
    }
    return Array.from(byTournament.values()).sort(
      (a, b) => new Date(b.tournament.startDate).getTime() - new Date(a.tournament.startDate).getTime(),
    )
  }, [query.data])

  return { ...query, results }
}

/* ---------------- カット通過確率バッジ（T-13-2 / 4-14 / T-13-7 が実装した endpoint） ---------------- */

export type CutProbabilityPlayerRow = {
  playerId?: number
  scoreId: number
  status: 'playing' | 'finished' | 'cut' | 'wd' | 'dq'
  toPar: number
  thru: number
  today: number
  diffFromCutLine: number
  holesRemaining: number
  /** 補-4-14-2: 0/25/50/75/100 の 5 段階のみ */
  cutProbability: 0 | 25 | 50 | 75 | 100
  tierLabel: '絶望的' | '厳しい' | '微妙' | 'やや有力' | '有力'
}

export type CutProbabilityResponse = {
  tournament: { id: number; name: string; slug: string }
  cutLineAfterRound: number
  round: { id: number; number: number; status: string }
  cutLine: { toPar: number; size: number; basedOnPlayers: number }
  players: CutProbabilityPlayerRow[]
}

/**
 * `GET /api/players/cut-probability`（T-13-7 / cms 側で実装済み）。
 * 開催中の大会に出場している選手の成績タブでのみ意味を持つため、呼び出し側で
 * 「対象大会が live かどうか」を判定してから `enabled` を渡す想定（画面側で制御）。
 */
export const useCutProbability = (
  tournamentId: number | undefined,
  playerId: number | undefined,
  round?: number,
  enabled = true,
) =>
  useCustom<CutProbabilityResponse>(
    qk.cutProbability(String(tournamentId ?? ''), String(playerId ?? ''), round),
    '/api/players/cut-probability',
    { tournamentId, round, playerIds: playerId },
    { enabled: enabled && Boolean(tournamentId) && Boolean(playerId) },
  )

/* ---------------- ストーリータブ（T-13-4 / 4-1） ---------------- */

/** Ph1 は公式映像ベースのラウンドハイライトに限定（補-4-1-2）。CMS 投入分をそのまま新着順で出す */
export const usePlayerStories = (playerId: string | undefined) =>
  useList<PlayerStory>(
    qk.playerStories(playerId ?? ''),
    'player-stories',
    {
      where: { player: { equals: playerId } },
      sort: 'order,-publishedAt',
      limit: 50,
      depth: 2, // story -> video -> thumbnail/file
    },
    { enabled: Boolean(playerId) },
  )

/* ---------------- 使用ギアタブ（T-13-3 / 4-6） ---------------- */

export type EquipmentCategory = NonNullable<Player['equipment']>[number]['category']

/** 補-4-6-1: カテゴリ表示ラベル */
export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  driver: 'ドライバー',
  iron: 'アイアン',
  wedge: 'ウェッジ',
  putter: 'パター',
  ball: 'ボール',
  wear: 'ウェア',
  shoes: 'シューズ',
}

export const EQUIPMENT_CATEGORY_ORDER: EquipmentCategory[] = [
  'driver',
  'iron',
  'wedge',
  'putter',
  'ball',
  'wear',
  'shoes',
]

/**
 * 補-4-6-2: ユーザー自身の `golfClubSetting`（`Users` コレクションに既存フィールドあり。
 * `app/mypage/edit.tsx` で編集可能）と選手の使用ギアが同カテゴリ・同ブランドなら「自分と同じ」。
 */
export const isSameAsMyGear = (
  item: { category: string; brand: string },
  mySettings: NonNullable<User['golfClubSetting']> | null | undefined,
): boolean =>
  (mySettings ?? []).some(
    (m) => m.category === item.category && m.brand.trim().toLowerCase() === item.brand.trim().toLowerCase(),
  )

/* ---------------- お気に入り一覧の出場状況（T-13-6 / 補-4-13-1） ---------------- */

export type FavoritePlayerStatus = { score: Score; round: Round; tournament: Tournament }

/**
 * お気に入り一覧の各行に出す「現在出場中なら大会名/順位/Today/Thru、そうでなければ直近大会の結果」。
 * お気に入りは複数選手・複数大会にまたがりうるため、選手ごとに最新 score（ラウンド番号最大）を選ぶ。
 * `round.status` が live/suspended の選手のみ画面側で「出場中」表示に振り分ける。
 * `live` が true の間は 15 秒ポーリングする（補-4-13-1、`useLiveQuery` の低速時自動延長つき）。
 */
export const useFavoritePlayersStatus = (playerIds: number[], live: boolean) => {
  const idsKey = commaList(playerIds)
  const query = useLiveQuery<PaginatedResponse<Score>>(
    qk.leaderboard('favorites-status', { players: idsKey }),
    () =>
      listCollection<Score>('scores', {
        where: { player: { in: idsKey } },
        sort: '-createdAt',
        limit: Math.max(playerIds.length, 1) * 6,
        depth: 2, // score -> round -> tournament / score -> player -> photo
      }),
    live,
    { enabled: playerIds.length > 0 },
  )

  const byPlayerId = useMemo(() => {
    const map = new Map<number, FavoritePlayerStatus>()
    for (const s of query.data?.docs ?? []) {
      const round = relDoc<Round>(s.round)
      if (!round) continue
      const tournament = relDoc<Tournament>(round.tournament)
      if (!tournament) continue
      const pid = relId(s.player)
      if (typeof pid !== 'number') continue
      const existing = map.get(pid)
      if (!existing || round.number > existing.round.number) {
        map.set(pid, { score: s, round, tournament })
      }
    }
    return map
  }, [query.data])

  return { ...query, byPlayerId }
}
