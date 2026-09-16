/**
 * ハイライト編成のデータ取得フック（EP-06 / 要求 2-14）。
 *
 * ADR-008 / 補-2-14-2 の要点:
 *  - 2-14 = ホーム**最上部**のカルーセル。`highlight-reels.type = home_carousel`。
 *    **全ユーザー共通**でパーソナライズしない（補-2-14-1）。運営が CMS で編成する。
 *  - 2-13 = ホーム**中段**のお気に入り選手レーン。ユーザーの `favorites` から**動的生成**。
 *    こちらは `src/queries/home.ts` の `useFavoritePlayers` 系で扱い、本ファイルでは扱わない。
 */
import { useMemo } from 'react'

import { relDoc } from '../features/common'
import { useList } from './hooks'
import { qk } from './keys'
import type { HighlightReel, Video } from '../types/payload'

/** 補-2-14-1: カルーセルは最大 8 件 */
export const HOME_CAROUSEL_MAX = 8

/** 補-2-14-1: 5 秒自動送り */
export const HOME_CAROUSEL_INTERVAL_MS = 5000

/**
 * 2-14 / 補-2-14-1: ホーム最上部カルーセル。
 * `type=home_carousel` の編成に収録された動画を `order` 昇順で平坦化し、最大 8 件返す。
 * deviceId / ログインユーザーを一切参照しない = 全ユーザー共通。
 */
export const useHomeCarousel = () => {
  const query = useList<HighlightReel>(qk.highlightsHome(), 'highlight-reels', {
    // 補-2-14-1: パーソナライズ条件（お気に入り等）を where に入れないこと
    where: { type: { equals: 'home_carousel' } },
    sort: 'order,-publishedAt',
    limit: HOME_CAROUSEL_MAX,
    depth: 2, // reel -> items(videos) -> thumbnail(media)
  })

  const slides = useMemo<Video[]>(() => {
    const reels = query.data?.docs ?? []
    const videos: Video[] = []
    for (const reel of reels) {
      for (const item of reel.items ?? []) {
        const v = relDoc<Video>(item)
        if (v && !videos.some((x) => x.id === v.id)) videos.push(v)
      }
    }
    return videos.slice(0, HOME_CAROUSEL_MAX)
  }, [query.data])

  return { ...query, slides }
}
