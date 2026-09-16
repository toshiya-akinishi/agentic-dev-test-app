/**
 * 大会・組み合わせのデータ取得フック（EP-07 / 要求 1-3, 1-4, 1-8）。
 * 画面からは必ずこのフック経由で取得する（AGENTS.md 3章）。
 */
import { useMemo } from 'react'

import { pickCurrentSeason } from '../lib/calendar'
import { useDoc, useList } from './hooks'
import { qk } from './keys'
import type { Pairing, Round, Season, Tournament } from '../types/payload'

/* ---------------- シーズン（補-1-3-3） ---------------- */

export const useSeasons = () => useList<Season>(qk.seasons(), 'seasons', { sort: '-year', limit: 50 })

/** 既定選択シーズン（現行シーズン、無ければ最新） */
export const useCurrentSeason = () => {
  const query = useSeasons()
  const season = useMemo(() => pickCurrentSeason(query.data?.docs ?? []), [query.data])
  return { ...query, season }
}

/* ---------------- 大会一覧（1-3, 1-4） ---------------- */

/**
 * 補-1-3-1: 一覧の並び順は「開催中 → 今後 → 終了(降順)」。
 * `postponed`（順延）は今後扱い、`cancelled`（中止）は終了と同じ末尾グループに含める
 * （元表・補完要件に明記が無いため、ユーザーが再訪する価値が高い順として決定）。
 */
const listRank = (t: Tournament): number => {
  if (t.status === 'live') return 0
  if (t.status === 'scheduled' || t.status === 'postponed') return 1
  return 2 // finished / cancelled
}

export const sortTournamentsForList = (docs: Tournament[]): Tournament[] =>
  [...docs].sort((a, b) => {
    const ra = listRank(a)
    const rb = listRank(b)
    if (ra !== rb) return ra - rb
    const da = new Date(a.startDate).getTime()
    const db = new Date(b.startDate).getTime()
    return ra === 2 ? db - da : da - db
  })

/** 補-1-3-1〜3: シーズン内の全大会。件数が少ない（1シーズン十数件）ため1回で取り切る */
export const useTournaments = (seasonId?: string) => {
  const query = useList<Tournament>(
    qk.tournaments({ season: seasonId ?? 'none' }),
    'tournaments',
    {
      where: seasonId ? { season: { equals: seasonId } } : undefined,
      sort: 'startDate',
      limit: 100,
      depth: 1, // tournament -> venue / heroImage
    },
    { enabled: Boolean(seasonId) },
  )
  const tournaments = useMemo(() => sortTournamentsForList(query.data?.docs ?? []), [query.data])
  return { ...query, tournaments }
}

/* ---------------- 大会詳細（1-8） ---------------- */

export const useTournament = (id: string | undefined) =>
  useDoc<Tournament>(qk.tournament(id ?? ''), 'tournaments', id, 2) // -> venue/season/course, heroImage, pamphletPdf

/* ---------------- ラウンド・組み合わせ（1-8 / 補-1-8-2, 補-1-8-3） ---------------- */

export const useTournamentRounds = (tournamentId?: string) =>
  useList<Round>(
    qk.rounds(tournamentId ?? ''),
    'rounds',
    { where: { tournament: { equals: tournamentId } }, sort: 'number', limit: 8, depth: 0 },
    { enabled: Boolean(tournamentId) },
  )

/** ラウンド未指定時に選択する既定ラウンド（開催中・中断 > 終了の最新 > 先頭） */
export const pickDefaultRound = (rounds: Round[]): Round | undefined =>
  rounds.find((r) => r.status === 'live') ??
  rounds.find((r) => r.status === 'suspended') ??
  [...rounds].reverse().find((r) => r.status === 'finished') ??
  rounds[0]

/** 補-1-8-2: ラウンド別組み合わせ。player -> photo まで展開するため depth 2 */
export const usePairings = (roundId: number | undefined) =>
  useList<Pairing>(
    qk.pairings(String(roundId ?? '')),
    'pairings',
    { where: { round: { equals: roundId } }, sort: 'startTime,groupNo', limit: 100, depth: 2 },
    { enabled: Boolean(roundId) },
  )
