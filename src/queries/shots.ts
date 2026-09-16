/**
 * ショットビューのデータ取得（EP-11 / T-11-1〜T-11-12 / 要求 1-37〜1-47）。
 *
 * `/shotview/[roundId]` はラウンド単体を起点に「ラウンド → 大会 → コース → ホール」と辿る。
 * cms 側の専用エンドポイントはまだ無いため、他の EP と同じく `shots` / `holes` / `hole-statistics`
 * コレクションを直接参照する（`src/queries/leaderboard.ts` と同じフォールバック方針）。
 */
import { useMemo } from 'react'

import { and } from '../api/query'
import { commaList, relDoc, relId } from '../features/common'
import { listCollection, useDoc, useList } from './hooks'
import { qk } from './keys'
import type { PaginatedResponse } from '../api/client'
import type { Course, Hole, HoleStatistic, Round, Score, Shot, Tournament } from '../types/payload'

/** ラウンド起点で大会/コースまで解決する（depth2: round -> tournament -> course/venue/season） */
export const useRound = (roundId: string | undefined) =>
  useDoc<Round>(qk.round(roundId ?? ''), 'rounds', roundId, 2)

/** ラウンド doc から大会・コースを取り出す（未展開＝id のみのときは undefined を返す） */
export const useRoundContext = (round: Round | undefined) => {
  const tournament = relDoc<Tournament>(round?.tournament)
  const course = tournament ? relDoc<Course>(tournament.course) : undefined
  return { tournament, course }
}

/** 補-1-42-1: コースの全ホール（ティー/グリーン/バウンディングボックス/ハザード） */
export const useCourseHoles = (courseId: number | undefined) => {
  const query = useList<Hole>(
    qk.holes(String(courseId ?? '')),
    'holes',
    { where: { course: { equals: courseId } }, sort: 'number', limit: 18, depth: 1 },
    { enabled: Boolean(courseId) },
  )
  const holes = useMemo(() => [...(query.data?.docs ?? [])].sort((a, b) => a.number - b.number), [query.data])
  return { ...query, holes }
}

/**
 * 補-1-37-1 / 補-1-43-1: 選択中ラウンド × ホール × 選手（最大4名）のショット。
 * ショットタップ→ボトムシート（補-1-38-1）用に player/video まで展開する。
 */
export const useHoleShots = (roundId: number | undefined, hole: number | undefined, playerIds: number[]) => {
  const idsKey = playerIds.length ? commaList(playerIds) : undefined
  const query = useList<Shot>(
    qk.shots({ round: roundId ?? 'none', hole: hole ?? 'none', players: idsKey ?? 'none' }),
    'shots',
    {
      where: and(
        { round: { equals: roundId } },
        { hole: { equals: hole } },
        idsKey ? { player: { in: idsKey } } : undefined,
      ),
      sort: 'player,shotNo',
      limit: 200,
      depth: 2, // shot -> player/video
    },
    { enabled: Boolean(roundId) && Boolean(hole) && playerIds.length > 0 },
  )

  const shotsByPlayer = useMemo(() => {
    const map = new Map<number, Shot[]>()
    for (const shot of query.data?.docs ?? []) {
      const pid = relId(shot.player)
      if (typeof pid !== 'number') continue
      const list = map.get(pid) ?? []
      list.push(shot)
      map.set(pid, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.shotNo - b.shotNo)
    return map
  }, [query.data])

  return { ...query, shots: query.data?.docs ?? [], shotsByPlayer }
}

/** 補-1-46-1: ホール別スコアチップ用に、表示中選手（先頭1名）のラウンド score を引く */
export const usePrimaryPlayerScore = (roundId: number | undefined, playerId: number | undefined) => {
  const query = useList<Score>(
    qk.leaderboard(String(roundId ?? ''), { scope: 'shotview-chip', player: playerId ?? 'none' }),
    'scores',
    { where: { round: { equals: roundId }, player: { equals: playerId } }, limit: 1, depth: 0 },
    { enabled: Boolean(roundId) && Boolean(playerId) },
  )
  return { ...query, score: query.data?.docs?.[0] }
}

/** 補-1-47-1: ホールのゾーン別成功確率（事前集計値をそのまま参照。実時間計算は行わない） */
export const useHoleStatistics = (tournamentId: number | undefined, hole: number | undefined) => {
  const query = useList<HoleStatistic>(
    qk.holeStatistics(String(tournamentId ?? ''), hole),
    'hole-statistics',
    { where: { tournament: { equals: tournamentId }, hole: { equals: hole } }, limit: 10, depth: 0 },
    { enabled: Boolean(tournamentId) && Boolean(hole) },
  )
  const byZone = useMemo(() => {
    const map = new Map<HoleStatistic['zone'], HoleStatistic>()
    for (const z of query.data?.docs ?? []) map.set(z.zone, z)
    return map
  }, [query.data])
  return { ...query, zones: query.data?.docs ?? [], byZone }
}

/** 補-1-47-2: サンプル数 30 未満は「参考値」と注記する */
export const LOW_SAMPLE_THRESHOLD = 30

/** 補-1-41-1: 同一ホールの過去平均スコア・バーディ率（大会内の全ラウンド × 全選手から集計） */
export type HoleAggregate = { avgStrokes: number | undefined; birdieRate: number | undefined; sampleSize: number }

export const aggregateHolePerformance = (scores: Score[], hole: number): HoleAggregate => {
  const entries = scores.flatMap((s) => (s.holeScores ?? []).filter((h) => h.hole === hole))
  if (!entries.length) return { avgStrokes: undefined, birdieRate: undefined, sampleSize: 0 }
  const avgStrokes = entries.reduce((a, h) => a + h.strokes, 0) / entries.length
  const birdies = entries.filter((h) => h.result === 'birdie' || h.result === 'eagle').length
  return { avgStrokes, birdieRate: (birdies / entries.length) * 100, sampleSize: entries.length }
}

/** 補-1-41-1: 当該選手の同ホール過去成績（大会内・ラウンド別） */
export type PlayerHoleHistoryRow = { roundId: number; strokes: number; toPar: number; result: string }

export const playerHolePerformance = (
  scores: Score[],
  hole: number,
  playerId: number,
): PlayerHoleHistoryRow[] =>
  scores
    .filter((s) => relId(s.player) === playerId)
    .flatMap((s) => {
      const h = (s.holeScores ?? []).find((x) => x.hole === hole)
      if (!h) return []
      const rid = relId(s.round) ?? relDoc<Round>(s.round)?.id
      return typeof rid === 'number' ? [{ roundId: rid, strokes: h.strokes, toPar: h.toPar, result: h.result }] : []
    })

/** 全ラウンド分の shots をまとめて取る（お気に入りショット一覧などラウンド横断の一覧向け） */
export const fetchShotsByIds = (ids: number[]) =>
  listCollection<Shot>('shots', { where: { id: { in: commaList(ids) } }, limit: ids.length, depth: 2 })

export type { PaginatedResponse }
