/**
 * ホーム/ストーリーのレーン構成（T-12-7 / 要求 2-13 / 補-2-13-1 / ADR-008）と
 * 縦型ストーリービューアの素材プール（T-12-6 / 要求 2-12）。
 *
 * ADR-008 の要点（`src/queries/highlights.ts` の 2-14 とは別物）:
 *  (a) 大会ハイライト = `highlight-reels.type=tournament_daily`。運営が CMS で手動選定・並べ替え。
 *  (b) お気に入り選手のプレー動画 = `favorites` からユーザー依存で動的生成する
 *      （このコレクションには保存しない。全ショット動画を対象に良かったプレー＝タグ付きを優先する）。
 */
import { useMemo } from 'react'

import { and } from '../api/query'
import { commaList, relDoc } from '../features/common'
import { useFavoritePlayers } from './home'
import { useList } from './hooks'
import { qk } from './keys'
import type { HighlightReel, Video } from '../types/payload'

const flattenReelVideos = (reels: HighlightReel[], limit: number): Video[] => {
  const videos: Video[] = []
  for (const reel of reels) {
    for (const item of reel.items ?? []) {
      const v = relDoc<Video>(item)
      if (v && !videos.some((x) => x.id === v.id)) videos.push(v)
    }
  }
  return videos.slice(0, limit)
}

export const TOURNAMENT_REEL_MAX = 10

/** 2-13(a): 大会ハイライト（運営編成） */
export const useTournamentHighlightReel = (tournamentId: number | undefined) => {
  const query = useList<HighlightReel>(
    qk.tournamentHighlightReel(String(tournamentId ?? '')),
    'highlight-reels',
    {
      where: { type: { equals: 'tournament_daily' }, tournament: { equals: tournamentId } },
      sort: 'order,-publishedAt',
      limit: 10,
      depth: 2, // reel -> items(videos) -> thumbnail
    },
    { enabled: Boolean(tournamentId) },
  )
  const videos = useMemo(() => flattenReelVideos(query.data?.docs ?? [], TOURNAMENT_REEL_MAX), [query.data])
  return { ...query, videos }
}

export const FAVORITE_PLAYER_REEL_MAX = 12

/**
 * 2-13(b): お気に入り選手のプレー動画（動的生成）。
 * 元表の議論「全ショット動画を対象に、この中からバーディーなど良かったプレーを自動選別」に沿い、
 * タグ付き（eagle/birdie/nice_shot 等）を優先し、残りを新着順で補う。
 */
export const useFavoritePlayerReel = () => {
  const { playerIds, isLoading: favLoading } = useFavoritePlayers()
  const ids = commaList(playerIds)

  const query = useList<Video>(
    qk.favoritePlayerReel(ids),
    'videos',
    {
      where: and({ player: { in: ids } }, { kind: { in: 'shot,highlight' } }),
      sort: '-publishedAt',
      limit: 40,
      depth: 1,
    },
    { enabled: playerIds.length > 0 },
  )

  const videos = useMemo(() => {
    const docs = query.data?.docs ?? []
    const tagged = docs.filter((v) => (v.tags?.length ?? 0) > 0)
    const untagged = docs.filter((v) => !(v.tags?.length ?? 0))
    return [...tagged, ...untagged].slice(0, FAVORITE_PLAYER_REEL_MAX)
  }, [query.data])

  return { ...query, videos, isLoading: query.isLoading || favLoading, hasFavorites: playerIds.length > 0 }
}

/**
 * 2-12: 縦型ストーリーの素材プール。`story_vertical`（15〜60秒の縦ショート）と
 * `player_story`（選手ストーリー、4-1 と共通）をまとめて 1 本のフィードにする。
 * `playerId` を渡すと特定選手のストーリーだけに絞る（選手詳細からの遷移用）。
 */
export const useStoryFeed = (playerId?: number) => {
  const query = useList<Video>(
    qk.storyFeed(playerId ? String(playerId) : undefined),
    'videos',
    {
      where: and(
        { kind: { in: 'story_vertical,player_story' } },
        playerId ? { player: { equals: playerId } } : undefined,
      ),
      sort: '-publishedAt',
      limit: 100,
      depth: 1,
    },
    {},
  )
  return { ...query, items: query.data?.docs ?? [] }
}
