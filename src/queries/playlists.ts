/**
 * プレイリスト（2-23 / 補-2-23-1, 2）と自動生成プレイリスト（2-15 / 補-2-15-1, 2）。
 * `playlists` は EP-02 で作成済みの owner/deviceId パターン（Favorites/Likes と同じ）。
 */
import * as Crypto from 'expo-crypto'
import { useAtomValue } from 'jotai'

import { or } from '../api/query'
import { relDoc } from '../features/common'
import { authUserAtom, deviceIdAtom } from '../store/auth'
import {
  createDoc,
  deleteDoc,
  getCustom,
  updateDoc,
  useApiMutation,
  useCustom,
  useDoc,
  useList,
  useQueryClient,
} from './hooks'
import { qk } from './keys'
import type { Video, Playlist } from '../types/payload'

/** 補-2-23-1: 1 プレイリスト最大 50 本 / 1 ユーザー最大 20 件 */
export const MAX_PLAYLIST_ITEMS = 50
export const MAX_PLAYLISTS_PER_OWNER = 20

const useOwner = () => {
  const user = useAtomValue(authUserAtom)
  const deviceId = useAtomValue(deviceIdAtom)
  const ownerKey = user ? `user:${user.id}` : deviceId ? `device:${deviceId}` : 'none'
  return { user, deviceId, ownerKey }
}

/** 自分のプレイリスト一覧（お気に入り一覧の「プレイリスト」導線・作成画面の一覧に使用） */
export const useMyPlaylists = () => {
  const { user, deviceId, ownerKey } = useOwner()
  const query = useList<Playlist>(
    qk.playlists(ownerKey),
    'playlists',
    {
      where: or(
        user ? { owner: { equals: user.id } } : undefined,
        deviceId ? { deviceId: { equals: deviceId } } : undefined,
      ),
      sort: '-updatedAt',
      limit: MAX_PLAYLISTS_PER_OWNER + 5, // 上限超過の検知用に少し余裕を持って取得する
      depth: 2, // playlist -> items(video) -> thumbnail（先頭項目のカバー表示用）
    },
    { enabled: Boolean(user || deviceId) },
  )
  return { ...query, playlists: query.data?.docs ?? [], ownerKey }
}

export const usePlaylist = (id: string | undefined) => useDoc<Playlist>(qk.playlist(id ?? ''), 'playlists', id, 2)

const itemIdsOf = (playlist: Playlist): number[] =>
  (playlist.items ?? []).map((it) => (typeof it === 'number' ? it : it.id))

/** プレイリスト作成。補-2-23-1: 1 ユーザー最大 20 件は呼び出し側（画面）で `useMyPlaylists` の件数を見て止める */
export const useCreatePlaylist = () => {
  const { user, deviceId, ownerKey } = useOwner()
  const queryClient = useQueryClient()
  return useApiMutation<Playlist, { name: string; firstVideoId?: number }>(
    async ({ name, firstVideoId }) => {
      const res = await createDoc<Playlist>('playlists', {
        name,
        items: firstVideoId ? [firstVideoId] : [],
        isPublic: false,
        ...(user ? { owner: user.id } : deviceId ? { deviceId } : {}),
      })
      return res.doc
    },
    { onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.playlists(ownerKey) }) },
  )
}

export const useDeletePlaylist = () => {
  const { ownerKey } = useOwner()
  const queryClient = useQueryClient()
  return useApiMutation<void, { id: number }>(
    async ({ id }) => {
      await deleteDoc('playlists', id)
    },
    { onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.playlists(ownerKey) }) },
  )
}

const invalidatePlaylist = (queryClient: ReturnType<typeof useQueryClient>, ownerKey: string, id: number) => {
  void queryClient.invalidateQueries({ queryKey: qk.playlists(ownerKey) })
  void queryClient.invalidateQueries({ queryKey: qk.playlist(String(id)) })
}

/** 補-2-23-1: 動画の追加（1 本あたり最大 50 本まで。超過分は呼び出し側で弾く） */
export const useAddVideoToPlaylist = () => {
  const { ownerKey } = useOwner()
  const queryClient = useQueryClient()
  return useApiMutation<Playlist, { playlist: Playlist; videoId: number }>(
    async ({ playlist, videoId }) => {
      const current = itemIdsOf(playlist)
      if (current.includes(videoId)) return playlist
      const next = [...current, videoId].slice(0, MAX_PLAYLIST_ITEMS)
      const res = await updateDoc<Playlist>('playlists', playlist.id, { items: next })
      return res.doc
    },
    { onSuccess: (doc) => invalidatePlaylist(queryClient, ownerKey, doc.id) },
  )
}

export const useRemoveVideoFromPlaylist = () => {
  const { ownerKey } = useOwner()
  const queryClient = useQueryClient()
  return useApiMutation<Playlist, { playlist: Playlist; videoId: number }>(
    async ({ playlist, videoId }) => {
      const next = itemIdsOf(playlist).filter((id) => id !== videoId)
      const res = await updateDoc<Playlist>('playlists', playlist.id, { items: next })
      return res.doc
    },
    { onSuccess: (doc) => invalidatePlaylist(queryClient, ownerKey, doc.id) },
  )
}

/** 並べ替え（上下移動）。ドラッグ&ドロップの代替として簡易な上下ボタンで実現する */
export const useReorderPlaylist = () => {
  const { ownerKey } = useOwner()
  const queryClient = useQueryClient()
  return useApiMutation<Playlist, { playlist: Playlist; fromIndex: number; toIndex: number }>(
    async ({ playlist, fromIndex, toIndex }) => {
      const ids = itemIdsOf(playlist)
      if (toIndex < 0 || toIndex >= ids.length) return playlist
      const [moved] = ids.splice(fromIndex, 1)
      ids.splice(toIndex, 0, moved)
      const res = await updateDoc<Playlist>('playlists', playlist.id, { items: ids })
      return res.doc
    },
    { onSuccess: (doc) => invalidatePlaylist(queryClient, ownerKey, doc.id) },
  )
}

/**
 * 補-2-23-2: 共有 ON/OFF。`shareToken` は CMS 側の自動採番フックが未確認のため、
 * 初回共有 ON 時にアプリ側で発行する（既存トークンがあれば使い回す）。
 */
export const useSetPlaylistSharing = () => {
  const { ownerKey } = useOwner()
  const queryClient = useQueryClient()
  return useApiMutation<Playlist, { playlist: Playlist; isPublic: boolean }>(
    async ({ playlist, isPublic }) => {
      const shareToken = isPublic ? (playlist.shareToken ?? Crypto.randomUUID()) : playlist.shareToken
      const res = await updateDoc<Playlist>('playlists', playlist.id, { isPublic, shareToken })
      return res.doc
    },
    { onSuccess: (doc) => invalidatePlaylist(queryClient, ownerKey, doc.id) },
  )
}

export const useRenamePlaylist = () => {
  const { ownerKey } = useOwner()
  const queryClient = useQueryClient()
  return useApiMutation<Playlist, { playlist: Playlist; name: string }>(
    async ({ playlist, name }) => {
      const res = await updateDoc<Playlist>('playlists', playlist.id, { name })
      return res.doc
    },
    { onSuccess: (doc) => invalidatePlaylist(queryClient, ownerKey, doc.id) },
  )
}

/** プレイリストの動画一覧（順序どおり）。items は depth 2 で Video まで展開済み */
export const playlistVideos = (playlist: Playlist | undefined): Video[] =>
  (playlist?.items ?? []).map((it) => relDoc<Video>(it)).filter((v): v is Video => Boolean(v))

/* ---------------- 自動生成プレイリスト（2-15 / 補-2-15-1, 2） ---------------- */

export type AutoPlaylistResponse = {
  roundId: string | number
  playerId: string | number
  count: number
  items: Video[]
  /** 補-2-15-2: 0 件のときのメッセージ（「本日の動画はまだありません」） */
  message?: string
}

/**
 * `GET /api/playlists/auto?roundId=&playerId=`（T-12-8, cms 側 / 補-2-15-1）。
 * ラウンド×選手のショット動画を hole 昇順→shotNo 昇順で並べたリストをサーバ側で都度生成する。永続化はしない。
 */
export const useAutoPlaylist = (roundId: string | undefined, playerId: string | undefined) =>
  useCustom<AutoPlaylistResponse>(
    qk.autoPlaylist(roundId ?? '', playerId ?? ''),
    '/api/playlists/auto',
    { roundId, playerId },
    { enabled: Boolean(roundId) && Boolean(playerId) },
  )

/** ボタン操作などその場で1回だけ取得したい場合用 */
export const fetchAutoPlaylist = (roundId: string, playerId: string) =>
  getCustom<AutoPlaylistResponse>('/api/playlists/auto', { roundId, playerId })
