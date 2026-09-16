/**
 * 現地情報・会場マップ・コースのデータ取得（EP-08 / T-08-1〜T-08-12 / 要求 1-14〜1-31）。
 *
 * `useTournament`（depth2）で venue/course は既に展開済みのため、ここでは
 * venue-facilities / transport-infos / weather-forecasts / player-positions のみを扱う。
 * 18ホール一覧（holes）・ホール別スコア集計は EP-11 が `src/queries/shots.ts` に用意した
 * `useCourseHoles` / `aggregateHolePerformance` をそのまま再利用する（補-1-19-2）。
 */
import { useMemo } from 'react'

import { and, or } from '../api/query'
import { commaList, relId } from '../features/common'
import { listCollection, useList, useLiveQuery } from './hooks'
import { qk } from './keys'
import type { PaginatedResponse } from '../api/client'
import type { PlayerPosition, TransportInfo, VenueFacility, WeatherForecast } from '../types/payload'

/* ---------------- 施設ピン（1-22, 1-25） ---------------- */

/** 補-1-22-1: 常設施設（tournament 未設定）+ 当該大会限定の施設をまとめて取得する */
export const useVenueFacilities = (venueId: number | undefined, tournamentId: number | undefined) =>
  useList<VenueFacility>(
    qk.venueFacilities(String(venueId ?? ''), tournamentId ? String(tournamentId) : undefined),
    'venue-facilities',
    {
      where: and(
        { venue: { equals: venueId } },
        tournamentId
          ? or({ tournament: { exists: false } }, { tournament: { equals: tournamentId } })
          : { tournament: { exists: false } },
      ),
      limit: 200,
      depth: 1, // facility -> photo / menuItems.photo
    },
    { enabled: Boolean(venueId) },
  )

/* ---------------- アクセス（1-14〜1-17） ---------------- */

/** 補-1-17-1: 電車/車/シャトルバス。ここでは大会ごとのギャラリーバス・駐車場・シャトル運行をまとめて返す */
export const useTransportInfos = (tournamentId: number | undefined) => {
  const query = useList<TransportInfo>(
    qk.transportInfos(String(tournamentId ?? '')),
    'transport-infos',
    { where: { tournament: { equals: tournamentId } }, limit: 50, depth: 0 },
    { enabled: Boolean(tournamentId) },
  )
  const docs = query.data?.docs ?? []
  const byType = useMemo(
    () => ({
      galleryBus: docs.filter((t) => t.type === 'gallery_bus'),
      parking: docs.filter((t) => t.type === 'parking'),
      shuttle: docs.filter((t) => t.type === 'shuttle'),
    }),
    [docs],
  )
  return { ...query, ...byType }
}

/* ---------------- 天候（1-24） ---------------- */

/** 補-1-24-1, 3: 1時間毎×72時間。取得箇所をここに集約し、API 差し替え時はここだけ直せばよい */
export const useWeatherForecasts = (tournamentId: number | undefined) => {
  const query = useList<WeatherForecast>(
    qk.weather(String(tournamentId ?? '')),
    'weather-forecasts',
    { where: { tournament: { equals: tournamentId } }, sort: 'forecastFor', limit: 100, depth: 0 },
    { enabled: Boolean(tournamentId) },
  )
  return { ...query, forecasts: query.data?.docs ?? [] }
}

/* ---------------- 選手位置（1-31 / MOCK） ---------------- */

/**
 * 補-1-31-1: 30秒間隔で再取得。表示対象は呼び出し側で「お気に入り選手」または「表示中の組」に
 * 絞り込んだ playerIds を渡すこと（全選手同時表示はしない）。
 */
export const usePlayerPositions = (
  tournamentId: number | undefined,
  playerIds: number[],
  live: boolean,
) => {
  const idsKey = playerIds.length ? commaList(playerIds) : undefined
  const query = useLiveQuery<PaginatedResponse<PlayerPosition>>(
    qk.playerPositions(String(tournamentId ?? ''), playerIds.map(String)),
    () =>
      listCollection<PlayerPosition>('player-positions', {
        where: and({ tournament: { equals: tournamentId } }, idsKey ? { player: { in: idsKey } } : undefined),
        sort: '-recordedAt',
        limit: Math.max(playerIds.length, 1) * 4,
        depth: 1, // position -> player -> photo
      }),
    live,
    { intervalMs: 30_000, enabled: Boolean(tournamentId) && playerIds.length > 0 },
  )

  /** 選手ごとの最新1件のみを使う（補-1-31-1） */
  const latestByPlayerId = useMemo(() => {
    const map = new Map<number, PlayerPosition>()
    for (const p of query.data?.docs ?? []) {
      const pid = relId(p.player)
      if (typeof pid !== 'number') continue
      const existing = map.get(pid)
      if (!existing || new Date(p.recordedAt).getTime() > new Date(existing.recordedAt).getTime()) {
        map.set(pid, p)
      }
    }
    return map
  }, [query.data])

  return { ...query, latestByPlayerId }
}
