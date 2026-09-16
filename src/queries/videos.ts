/**
 * 動画ライブラリのデータ取得フック（EP-12 / 要求 2-8, 2-9, 2-10）。
 * 画面からは必ずこのフック経由で取得する（AGENTS.md 3章）。
 */
import { useMemo } from 'react'

import { and } from '../api/query'
import { relDoc, relId } from '../features/common'
import { flattenPages, useDoc, useInfiniteList, useList } from './hooks'
import { qk } from './keys'
import type { VideoFilters } from '../store/ui'
import type { Hole, Player, Tournament, Video } from '../types/payload'

/** 補-2-8-2: 一覧のページサイズ */
export const VIDEO_PAGE_SIZE = 20

/** 補-2-10-1: タグ 8 種。CMS 側 `VIDEO_TAG_OPTIONS`（watch ページ）とラベルを合わせる */
export const VIDEO_TAG_OPTIONS = [
  { value: 'eagle', label: 'イーグル' },
  { value: 'birdie', label: 'バーディー' },
  { value: 'hole_in_one', label: 'ホールインワン' },
  { value: 'long_putt', label: 'ロングパット' },
  { value: 'nice_shot', label: 'ナイスショット' },
  { value: 'approach', label: 'アプローチ' },
  { value: 'bunker_save', label: 'バンカーセーブ' },
  { value: 'drive', label: 'ドライブ' },
] as const

export type VideoTag = (typeof VIDEO_TAG_OPTIONS)[number]['value']

export const videoTagLabel = (tag: string): string =>
  VIDEO_TAG_OPTIONS.find((o) => o.value === tag)?.label ?? tag

/** 2-9 / 補-2-8-1: ショット種別 6 種 */
export const SHOT_TYPE_OPTIONS = [
  { value: 'tee', label: 'ティーショット' },
  { value: 'approach', label: 'アプローチ' },
  { value: 'bunker', label: 'バンカー' },
  { value: 'recovery', label: 'リカバリー' },
  { value: 'putt', label: 'パット' },
  { value: 'penalty', label: 'ペナルティ' },
] as const

export const shotTypeLabel = (v: string | null | undefined): string =>
  SHOT_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? '-'

export const SORT_OPTIONS = [
  { value: 'newest', label: '新着順' },
  { value: 'popular', label: '人気順' },
] as const

/**
 * 補-2-8-1: 6 軸フィルタ（大会/ラウンド/選手/ホール/種別/タグ）の AND 条件。
 * ストーリー/選手ストーリー/アーカイブ動画は一覧の対象外とし、ショット動画とハイライトのみを出す
 * （縦型ストーリーは `/stories`、ライブアーカイブは `/live/[id]` が入口のため）。
 */
export const useVideoList = (filters: VideoFilters) => {
  const where = and(
    { kind: { in: 'shot,highlight' } },
    filters.tournament ? { tournament: { equals: filters.tournament } } : undefined,
    filters.round ? { round: { equals: filters.round } } : undefined,
    filters.player ? { player: { equals: filters.player } } : undefined,
    filters.hole ? { hole: { equals: filters.hole } } : undefined,
    filters.shotType ? { shotType: { equals: filters.shotType } } : undefined,
    filters.tag ? { tags: { in: filters.tag } } : undefined,
  )

  const query = useInfiniteList<Video>(
    qk.videos(filters),
    'videos',
    { where, sort: filters.sort === 'popular' ? '-likeCount,-publishedAt' : '-publishedAt', depth: 1 },
    { limit: VIDEO_PAGE_SIZE },
  )

  return { ...query, items: flattenPages<Video>(query.data) }
}

/** 2-9: 動画詳細。tournament -> course まで展開してミニマップ用の course id が取れるよう depth 2 */
export const useVideo = (id: string | undefined) => useDoc<Video>(qk.video(id ?? ''), 'videos', id, 2)

/* ---------------- フィルタ用の補助データ ---------------- */

/** 補-2-8-1: 大会フィルタのチップ一覧。件数が限られるため全件を 1 度に取得する */
export const useAllTournamentsForFilter = () =>
  useList<Tournament>(qk.allTournamentsForFilter(), 'tournaments', { sort: '-startDate', limit: 50, depth: 0 })

/** 補-2-8-1: 選手フィルタ。件数が限られるため全件を 1 度に取得し、端末側で絞り込む（用語集と同じ方式） */
export const useAllPlayersForFilter = () =>
  useList<Player>(qk.allPlayersForFilter(), 'players', {
    where: { isActive: { equals: true } },
    sort: 'name',
    limit: 500,
    depth: 0,
  })

/** 補-1-42-1 のホール `bounds` をミニマップの座標変換に使う（T-12-2 note 3: EP-11 の簡易プレビュー） */
export const useVideoHole = (video: Video | undefined) => {
  const tournament = video ? relDoc<Tournament>(video.tournament) : undefined
  const courseId = tournament ? relId(tournament.course) : undefined
  const hole = video?.hole ?? undefined

  const query = useList<Hole>(
    qk.videoHole(String(courseId ?? ''), String(hole ?? '')),
    'holes',
    { where: { course: { equals: courseId }, number: { equals: hole } }, limit: 1, depth: 0 },
    { enabled: Boolean(courseId) && Boolean(hole) },
  )

  const holeDoc = useMemo(() => query.data?.docs?.[0], [query.data])
  return { ...query, hole: holeDoc }
}
