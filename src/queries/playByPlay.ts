/**
 * Play-by-play 速報フィード・ショット動画導線（EP-10 / T-10-7, T-10-8, T-10-10 / 要求 3-3, 3-8）。
 *
 * cms 側の `GET /api/play-by-play/:roundId`（hub docs/03-api-spec.md 3章）はまだ実装されていない
 * （`src/queries/leaderboard.ts` と同じ理由で `shots` コレクション直接参照にフォールバックする）。
 */
import { useMemo } from 'react'

import { commaList, relDoc, relId } from '../features/common'
import { listCollection, useLiveQuery } from './hooks'
import { qk } from './keys'
import type { PaginatedResponse } from '../api/client'
import type { Round, Shot } from '../types/payload'

/** 補-3-3-3: フィルタ既定は「お気に入り選手のみ」 */
export type PlayByPlayFilter = 'favorites' | 'all' | 'player'

/**
 * ラウンドの速報フィード。新しい打球から順に並べる（補-3-3-4: 先頭に追記）。
 * `live` は round.status === 'live' のときのみ true を渡す（補-3-3-4 の 15 秒ポーリング）。
 */
export const useRoundShots = (
  roundId: number | undefined,
  playerIds: number[] | undefined,
  live: boolean,
  limit = 60,
) => {
  const idsKey = playerIds && playerIds.length ? commaList(playerIds) : undefined
  return useLiveQuery<PaginatedResponse<Shot>>(
    qk.playByPlay(String(roundId ?? ''), { players: idsKey ?? 'all', limit }),
    () =>
      listCollection<Shot>('shots', {
        where: idsKey
          ? { round: { equals: roundId }, player: { in: idsKey } }
          : { round: { equals: roundId } },
        sort: '-occurredAt',
        limit,
        depth: 2, // shot -> player/video
      }),
    live,
    { enabled: Boolean(roundId) },
  )
}

/** 補-3-8-1(a): Hole-by-Hole の各セルに動画導線を出すため、ラウンド×選手のショットをまとめて引く */
export const usePlayerRoundShots = (roundId: number | undefined, playerId: number | undefined) => {
  const query = useLiveQuery<PaginatedResponse<Shot>>(
    qk.playerRoundShots(String(roundId ?? ''), String(playerId ?? '')),
    () =>
      listCollection<Shot>('shots', {
        where: { round: { equals: roundId }, player: { equals: playerId } },
        sort: 'hole,shotNo',
        limit: 100,
        depth: 1, // shot -> video
      }),
    false,
    { enabled: Boolean(roundId) && Boolean(playerId) },
  )

  /** ホール番号 → 動画つきショット（無ければ undefined。補-3-8-2: 動画が無ければ導線を出さない） */
  const videoShotByHole = useMemo(() => {
    const map = new Map<number, Shot>()
    for (const shot of query.data?.docs ?? []) {
      if (shot.video && !map.has(shot.hole)) map.set(shot.hole, shot)
    }
    return map
  }, [query.data])

  return { ...query, shots: query.data?.docs ?? [], videoShotByHole }
}

/** 新着判定（補-3-3-4）。前回表示していた先頭ショットより新しいものの件数を返す */
export const countNewShots = (shots: Shot[], lastSeenTopId: number | undefined): number => {
  if (lastSeenTopId === undefined) return 0
  const idx = shots.findIndex((s) => s.id === lastSeenTopId)
  return idx < 0 ? shots.length : idx
}

export const shotRoundNumber = (shot: Shot, roundNumberById: Map<number, number>): number | undefined => {
  const rid = relId(shot.round)
  if (typeof rid === 'number') return roundNumberById.get(rid)
  return relDoc<Round>(shot.round)?.number
}
