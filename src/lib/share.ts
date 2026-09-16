/**
 * 動画シェア（2-21, 2-22 / 補-2-21-1, 2 / ADR-009）。
 *
 * OS 標準シェアシートで Web 視聴ページ `/watch/<slug>` の URL のみを共有する。
 * 動画ファイルそのものの DL・書き出しは提供しない（ADR-009）。
 * `video.shareUrl` は CMS 側で `https://<cms>/watch/<slug>` を既定値として持つ
 * （補-2-21-2）。未設定の場合のみアプリ側で `API_URL` から組み立てる
 * （T-12-11 の OGP ページが未反映でも 404 するだけで、リンク自体は組み立てられる
 *  ＝ このプロジェクトで繰り返されている「前方参照」パターン）。
 */
import { Share } from 'react-native'

import { API_URL } from '../api/client'
import type { Playlist, Video } from '../types/payload'

export const buildWatchUrl = (video: Pick<Video, 'shareUrl' | 'slug'>): string =>
  video.shareUrl && video.shareUrl.trim().length > 0 ? video.shareUrl : `${API_URL}/watch/${video.slug}`

/**
 * OS 標準シェアシートを開く。URL のみを渡す（ファイルパスや `file`/`hlsUrl` は絶対に渡さない）。
 */
export const shareVideo = async (video: Pick<Video, 'shareUrl' | 'slug' | 'title'>): Promise<void> => {
  const url = buildWatchUrl(video)
  try {
    await Share.share({ message: `${video.title}\n${url}`, url, title: video.title })
  } catch {
    // ユーザーによるキャンセル等。エラー表示は不要
  }
}

/**
 * 補-2-23-2: プレイリストの共有 URL。
 * cms 側に専用の Web 視聴ページがまだ無い前提での前方参照（`/watch/[slug]` と同じパターン）。
 * `shareToken` 未発行の場合は undefined を返す。
 */
export const buildPlaylistShareUrl = (playlist: Pick<Playlist, 'shareToken'>): string | undefined =>
  playlist.shareToken ? `${API_URL}/playlist/${playlist.shareToken}` : undefined

export const sharePlaylist = async (playlist: Pick<Playlist, 'shareToken' | 'name'>): Promise<void> => {
  const url = buildPlaylistShareUrl(playlist)
  if (!url) return
  try {
    await Share.share({ message: `${playlist.name}\n${url}`, url, title: playlist.name })
  } catch {
    // ユーザーによるキャンセル等
  }
}
