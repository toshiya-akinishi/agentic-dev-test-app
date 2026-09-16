/**
 * 動画のいいね（2-11 / 補-2-11-1, 2）。
 * ログイン不要。ゲストは `deviceId` に紐づく（補-2-11-1）。ログイン時にゲストのいいねを
 * 引き継ぐ処理は cms 側のマージ（補-6-1-1）に依存し、アプリ側は owner/deviceId のどちらで
 * 引くかだけを明示する（`src/queries/home.ts` の `useFavoritePlayers` と同じ方式）。
 */
import { useAtomValue } from 'jotai'
import { useMemo } from 'react'

import { or } from '../api/query'
import { relDoc, relId } from '../features/common'
import { authUserAtom, deviceIdAtom } from '../store/auth'
import { createDoc, deleteDoc, useApiMutation, useList, useQueryClient } from './hooks'
import { qk } from './keys'
import type { Like, Shot, Video } from '../types/payload'

const useLikeOwnerKey = () => {
  const user = useAtomValue(authUserAtom)
  const deviceId = useAtomValue(deviceIdAtom)
  const ownerKey = user ? `user:${user.id}` : deviceId ? `device:${deviceId}` : 'none'
  return { user, deviceId, ownerKey }
}

/**
 * いいねした動画一覧（補-2-11-2: 動画タブ・新着順）。
 * `video` が設定されているレコードのみを対象にする（`likes.shot` の 1-45 とは別軸）。
 */
export const useLikedVideos = () => {
  const { user, deviceId, ownerKey } = useLikeOwnerKey()

  const query = useList<Like>(
    qk.likes(ownerKey, 'video'),
    'likes',
    {
      where: or(
        user ? { owner: { equals: user.id } } : undefined,
        deviceId ? { deviceId: { equals: deviceId } } : undefined,
      ),
      sort: '-createdAt',
      limit: 200,
      depth: 2, // like -> video -> thumbnail
    },
    { enabled: Boolean(user || deviceId) },
  )

  const likes = useMemo(
    () => (query.data?.docs ?? []).filter((l) => l.video !== null && l.video !== undefined),
    [query.data],
  )
  const videos = useMemo(
    () => likes.map((l) => relDoc<Video>(l.video)).filter((v): v is Video => Boolean(v)),
    [likes],
  )
  const likedVideoIds = useMemo(() => new Set(likes.map((l) => relId(l.video)).filter((x): x is number => typeof x === 'number')), [likes])
  const likeIdByVideoId = useMemo(() => {
    const map = new Map<number, number>()
    for (const l of likes) {
      const vid = relId(l.video)
      if (typeof vid === 'number') map.set(vid, l.id)
    }
    return map
  }, [likes])

  return { ...query, likes, videos, likedVideoIds, likeIdByVideoId, ownerKey }
}

/** いいねの登録/解除トグル。動画一覧・詳細・お気に入り一覧から共通で使う */
export const useToggleVideoLike = () => {
  const { user, deviceId, ownerKey } = useLikeOwnerKey()
  const queryClient = useQueryClient()

  return useApiMutation<void, { videoId: number; likeId?: number }>(
    async ({ videoId, likeId }) => {
      if (likeId) {
        await deleteDoc('likes', likeId)
      } else {
        await createDoc<Like>('likes', {
          video: videoId,
          ...(user ? { owner: user.id } : deviceId ? { deviceId } : {}),
        })
      }
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: qk.likes(ownerKey, 'video') })
      },
    },
  )
}

/**
 * お気に入りショット（1-45 / 補-1-45-1）。動画のいいねと同じ `likes` コレクションの
 * `shot` 側を使う。お気に入り一覧「ショット」タブ（T-11-9）とショットビューのボトムシートで共通利用する。
 */
export const useLikedShots = () => {
  const { user, deviceId, ownerKey } = useLikeOwnerKey()

  const query = useList<Like>(
    qk.likes(ownerKey, 'shot'),
    'likes',
    {
      where: or(
        user ? { owner: { equals: user.id } } : undefined,
        deviceId ? { deviceId: { equals: deviceId } } : undefined,
      ),
      sort: '-createdAt',
      limit: 200,
      depth: 2, // like -> shot -> player/video
    },
    { enabled: Boolean(user || deviceId) },
  )

  const likes = useMemo(
    () => (query.data?.docs ?? []).filter((l) => l.shot !== null && l.shot !== undefined),
    [query.data],
  )
  const shots = useMemo(
    () => likes.map((l) => relDoc<Shot>(l.shot)).filter((s): s is Shot => Boolean(s)),
    [likes],
  )
  const likedShotIds = useMemo(
    () => new Set(likes.map((l) => relId(l.shot)).filter((x): x is number => typeof x === 'number')),
    [likes],
  )
  const likeIdByShotId = useMemo(() => {
    const map = new Map<number, number>()
    for (const l of likes) {
      const sid = relId(l.shot)
      if (typeof sid === 'number') map.set(sid, l.id)
    }
    return map
  }, [likes])

  return { ...query, likes, shots, likedShotIds, likeIdByShotId, ownerKey }
}

/** いいねの登録/解除トグル（ショット版）。ショットビューのボトムシートから使う */
export const useToggleShotLike = () => {
  const { user, deviceId, ownerKey } = useLikeOwnerKey()
  const queryClient = useQueryClient()

  return useApiMutation<void, { shotId: number; likeId?: number }>(
    async ({ shotId, likeId }) => {
      if (likeId) {
        await deleteDoc('likes', likeId)
      } else {
        await createDoc<Like>('likes', {
          shot: shotId,
          ...(user ? { owner: user.id } : deviceId ? { deviceId } : {}),
        })
      }
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: qk.likes(ownerKey, 'shot') })
      },
    },
  )
}
