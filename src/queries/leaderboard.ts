/**
 * リーダーボードのデータ取得・整形（EP-10 / T-10-1〜T-10-6 / 要求 3-1, 3-2, 3-6, 3-7, 3-9）。
 *
 * cms 側の `GET /api/leaderboard/:tournamentId` `.../compare`（hub docs/03-api-spec.md 3章）は
 * まだ実装されていない（EP-16 系の認証・ランキング作業と並行中のため想定内のギャップ。
 * `src/queries/home.ts` / `rankings.ts` と同じ「コレクション直接参照へのフォールバック」パターンを踏襲する）。
 * `scores` はラウンド単位の 1 レコード（そのラウンド終了時点の累計 Total/Today/Thru/順位）なので、
 * 大会の全ラウンド分をまとめて取得し、選手ごとに「最新ラウンドの行」を Total/Today/Thru/順位の代表値として使い、
 * 各ラウンド番号の行から R1〜R4 列（補-3-1-1）を組み立てる。
 */
import { useMemo } from 'react'

import { commaList, relDoc, relId } from '../features/common'
import { normalizeForSearch } from '../features/guide/search'
import { listCollection, useList, useLiveQuery } from './hooks'
import { qk } from './keys'
import { useTournamentRounds } from './tournaments'
import type { PaginatedResponse } from '../api/client'
import type { Pairing, Player, Round, Score, Tournament } from '../types/payload'

/** 選手 1 名分のリーダーボード行（ラウンド横断で組み立てた表示単位） */
export type LeaderboardEntry = {
  player: Player
  /** Total / Today / Thru / 順位 / ステータスの代表行（最新ラウンドの score） */
  latest: Score
  /** ラウンド番号 → その回の score（R1〜R4 列に使用） */
  byRoundNumber: Record<number, Score>
}

/** 大会内の全ラウンド分の scores（depth2: score -> player -> photo） */
export const useTournamentScores = (
  tournamentId: string | undefined,
  roundIds: number[],
  live: boolean,
) => {
  const idsKey = commaList(roundIds)
  return useLiveQuery<PaginatedResponse<Score>>(
    qk.leaderboard(tournamentId ?? '', { rounds: idsKey }),
    () =>
      listCollection<Score>('scores', {
        where: { round: { in: idsKey } },
        sort: 'position',
        limit: 500,
        depth: 2,
      }),
    live,
    { enabled: Boolean(tournamentId) && roundIds.length > 0 },
  )
}

/** score.round（id もしくは展開済み Round）からラウンド番号を引く */
const roundNumberOf = (score: Score, roundNumberById: Map<number, number>): number | undefined => {
  const rid = relId(score.round)
  if (typeof rid === 'number') return roundNumberById.get(rid)
  const round = relDoc<Round>(score.round)
  return round?.number
}

/**
 * 選手ごとにラウンド横断でまとめる（補-3-1-1）。
 * 「最新」= その選手が持つ score のうちラウンド番号が最も大きいもの
 * （予選落ちなど途中で行が途切れる選手はカット時点のラウンドが最新になる）。
 */
export const buildLeaderboardEntries = (scores: Score[], rounds: Round[]): LeaderboardEntry[] => {
  const roundNumberById = new Map<number, number>(rounds.map((r) => [r.id, r.number]))
  const byPlayer = new Map<number, LeaderboardEntry>()

  for (const s of scores) {
    const player = relDoc<Player>(s.player)
    if (!player) continue
    const roundNumber = roundNumberOf(s, roundNumberById)

    let entry = byPlayer.get(player.id)
    if (!entry) {
      entry = { player, latest: s, byRoundNumber: {} }
      byPlayer.set(player.id, entry)
    }
    if (roundNumber !== undefined) entry.byRoundNumber[roundNumber] = s

    const currentLatestRoundNumber = roundNumberOf(entry.latest, roundNumberById) ?? -1
    if ((roundNumber ?? -1) >= currentLatestRoundNumber) entry.latest = s
  }

  return Array.from(byPlayer.values()).sort((a, b) => {
    const pa = a.latest.position ?? Number.POSITIVE_INFINITY
    const pb = b.latest.position ?? Number.POSITIVE_INFINITY
    if (pa !== pb) return pa - pb
    return a.player.name.localeCompare(b.player.name, 'ja')
  })
}

/** 補-3-1-1: カットライン。`status=cut` の選手が現れる境目に区切り線 + `CUT ±n` を表示する */
export type CutLineInfo = { index: number; toPar: number }

export const computeCutLine = (entries: LeaderboardEntry[]): CutLineInfo | undefined => {
  const firstCutIndex = entries.findIndex((e) => e.latest.status === 'cut')
  if (firstCutIndex < 0) return undefined

  const madeCut = entries.filter((e) => e.latest.status !== 'cut')
  const cut = entries.filter((e) => e.latest.status === 'cut')
  const cutToPar = madeCut.length
    ? Math.max(...madeCut.map((e) => e.latest.toPar))
    : Math.min(...cut.map((e) => e.latest.toPar)) - 1

  return { index: firstCutIndex, toPar: cutToPar }
}

/** 補-3-1-3: 絞り込み種別 */
export type LeaderboardFilterKind = 'all' | 'favorites' | 'group'

export const filterEntries = (
  entries: LeaderboardEntry[],
  opts: {
    filter: LeaderboardFilterKind
    favoritePlayerIds: Set<number>
    group?: Pairing
    search: string
  },
): LeaderboardEntry[] => {
  let out = entries

  if (opts.filter === 'favorites') {
    out = out.filter((e) => opts.favoritePlayerIds.has(e.player.id))
  } else if (opts.filter === 'group' && opts.group) {
    const groupPlayerIds = new Set(
      (opts.group.players ?? []).map((p) => relId(p)).filter((x): x is number => typeof x === 'number'),
    )
    out = out.filter((e) => groupPlayerIds.has(e.player.id))
  }

  const q = normalizeForSearch(opts.search)
  if (q) {
    out = out.filter((e) => {
      const name = normalizeForSearch(e.player.name)
      const nameEn = normalizeForSearch(e.player.nameEn)
      return name.includes(q) || nameEn.includes(q)
    })
  }

  return out
}

/** 補-3-2-2: OUT(1-9) / IN(10-18) の小計・18H合計 */
export type HoleTotals = { strokes: number; toPar: number; count: number }

export const sumHoles = (
  holeScores: NonNullable<Score['holeScores']>,
  from: number,
  to: number,
): HoleTotals => {
  const subset = holeScores.filter((h) => h.hole >= from && h.hole <= to)
  return {
    strokes: subset.reduce((a, h) => a + h.strokes, 0),
    toPar: subset.reduce((a, h) => a + h.toPar, 0),
    count: subset.length,
  }
}

/** 選手別スタッツ（3-6）: ラウンド別は score.stats をそのまま使う。大会累計はここで平均する */
export type Stats6 = NonNullable<Score['stats']>

const STAT_KEYS: Array<keyof Stats6> = [
  'drivingDistance',
  'fairwayHitRate',
  'greenInRegulation',
  'puttsPerRound',
  'sandSaveRate',
  'scrambleRate',
]

export const aggregateStats = (scores: Score[]): Stats6 => {
  const out: Stats6 = {}
  for (const key of STAT_KEYS) {
    const values = scores
      .map((s) => s.stats?.[key])
      .filter((v): v is number => typeof v === 'number')
    out[key] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
  }
  return out
}

/** 補-3-6-1: 大会累計スタッツ用に、対象選手の大会内 全ラウンド分の scores を取得する */
export const usePlayerTournamentScores = (
  tournamentId: string | undefined,
  playerId: number | undefined,
) => {
  const { data: roundsData } = useTournamentRounds(tournamentId)
  const roundIds = useMemo(() => (roundsData?.docs ?? []).map((r) => r.id), [roundsData])
  const idsKey = commaList(roundIds)

  const query = useLiveQuery<PaginatedResponse<Score>>(
    qk.playerTournamentScores(tournamentId ?? '', String(playerId ?? '')),
    () =>
      listCollection<Score>('scores', {
        where: { round: { in: idsKey }, player: { equals: playerId } },
        limit: 10,
        depth: 0,
      }),
    false,
    { enabled: Boolean(tournamentId) && Boolean(playerId) && roundIds.length > 0 },
  )

  const stats = useMemo(() => aggregateStats(query.data?.docs ?? []), [query.data])
  return { ...query, scores: query.data?.docs ?? [], stats }
}

/** 補-3-7-1: 比較用（最大4名 / ADR-007）。指定選手の全ラウンド分 scores を depth2 で取得する */
export const useCompareScores = (tournamentId: string | undefined, playerIds: number[]) => {
  const { data: roundsData } = useTournamentRounds(tournamentId)
  const roundIds = useMemo(() => (roundsData?.docs ?? []).map((r) => r.id), [roundsData])
  const roundIdsKey = commaList(roundIds)
  const playerIdsKey = commaList(playerIds)

  const query = useLiveQuery<PaginatedResponse<Score>>(
    qk.compare(tournamentId ?? '', playerIds.map(String)),
    () =>
      listCollection<Score>('scores', {
        where: { round: { in: roundIdsKey }, player: { in: playerIdsKey } },
        limit: 100,
        depth: 2,
      }),
    false,
    {
      enabled: Boolean(tournamentId) && roundIds.length > 0 && playerIds.length > 0,
    },
  )

  const rounds = roundsData?.docs ?? []
  const entries = useMemo(
    () => buildLeaderboardEntries(query.data?.docs ?? [], rounds),
    [query.data, rounds],
  )

  return { ...query, rounds, entries }
}

/* ---------------- 過去大会検索（3-9 / 補-3-9-1〜3） ---------------- */

/** 補-3-9-1: 選手名検索（過去大会検索の「選手」軸） */
export const usePlayerSearch = (rawQuery: string) => {
  const query = normalizeForSearch(rawQuery)
  return useList<Player>(
    qk.playerSearch(query),
    'players',
    { where: rawQuery ? { name: { contains: rawQuery } } : undefined, sort: 'name', limit: 20 },
    { enabled: query.length > 0 },
  )
}

/**
 * 補-3-9-2: 選手起点の検索（選手詳細 →「出場大会履歴」）。
 * scores を player で引き、round -> tournament まで depth2 で展開してユニークな大会一覧にする。
 */
export const usePlayerTournamentHistory = (playerId: number | undefined) => {
  const query = useList<Score>(
    qk.playerTournamentHistory(String(playerId ?? '')),
    'scores',
    { where: { player: { equals: playerId } }, sort: '-createdAt', limit: 200, depth: 2 },
    { enabled: Boolean(playerId) },
  )

  const tournaments = useMemo(() => {
    const map = new Map<number, Tournament>()
    for (const s of query.data?.docs ?? []) {
      const round = relDoc<Round>(s.round)
      const tournament = round ? relDoc<Tournament>(round.tournament) : undefined
      if (tournament) map.set(tournament.id, tournament)
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    )
  }, [query.data])

  return { ...query, tournaments }
}
