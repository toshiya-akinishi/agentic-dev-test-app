/**
 * features 横断の小さなヘルパ（EP-06）。
 * Payload のリレーション値（id もしくは展開済みドキュメント）と
 * media の URL 解決だけを扱う純粋関数。UI もフックも持たない。
 */
import { API_URL } from '../api/client'
import type { Media } from '../types/payload'

/** Payload のリレーションは depth により id か展開済みドキュメントのどちらかで返る */
export type Rel<T> = number | T | null | undefined

export const relDoc = <T>(v: Rel<T>): T | undefined =>
  v !== null && v !== undefined && typeof v === 'object' ? (v as T) : undefined

export const relId = (v: Rel<{ id: number }>): number | undefined => {
  if (v === null || v === undefined) return undefined
  return typeof v === 'number' ? v : v.id
}

export const relIds = (list: Array<Rel<{ id: number }>> | null | undefined): number[] =>
  (list ?? []).map(relId).filter((x): x is number => typeof x === 'number')

export const uniqIds = (ids: number[]): number[] => Array.from(new Set(ids))

/** CMS 相対パス（例 `/api/media/file/foo.jpg`）に API_URL を前置して絶対 URL にする */
export const absoluteMediaUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined
  return /^https?:\/\//.test(url) ? url : `${API_URL}${url}`
}

/**
 * Payload の media.url は CMS 相対パス（例 `/api/media/file/foo.jpg`）で返るため
 * API_URL を前置して絶対 URL にする。
 */
export const mediaUrl = (
  m: Rel<Media>,
  size?: 'thumb' | 'card' | 'hero',
): string | undefined => {
  const doc = relDoc<Media>(m)
  if (!doc) return undefined
  const sized = size ? doc.sizes?.[size]?.url : undefined
  const url = sized ?? doc.url
  return absoluteMediaUrl(url)
}

/** Payload の `in` 演算子はカンマ区切り文字列で渡す（docs/03-api-spec.md 2章） */
export const commaList = (ids: Array<number | string>): string => ids.join(',')

/**
 * リッチテキスト本文中の手動リンク（補-1-2-3: 自動リンク化はしない）の遷移先を
 * アプリ内ルートへ解決する。観戦ガイド記事・用語集・ニュース詳細の全画面から共通で使う。
 * 対応先が無い relationTo は `undefined` を返し、呼び出し側で外部 URL にフォールバックさせる。
 */
export const internalRouteFor = (target: {
  relationTo?: string
  id?: string
}): string | undefined => {
  if (!target.id) return undefined
  switch (target.relationTo) {
    case 'glossary-terms':
      return `/glossary/${target.id}`
    case 'guide-articles':
      // 補足: guide-articles の詳細ルートは slug 引きだが、リレーション値は id しか
      // 持たないことがあるため `useGuideArticle` 側で slug/id どちらでも解決する
      return `/guide/${target.id}`
    case 'news':
      return `/news/${target.id}`
    case 'players':
      return `/player/${target.id}`
    case 'tournaments':
      return `/tournament/${target.id}`
    default:
      return undefined
  }
}

/**
 * 通知センター（6-17 / 補-6-17-2）の `deepLink` をアプリ内ルートへ解決する。
 * CMS 側は `jtour://<kind>/<id>?player=<id>` 形式の独自スキームで発行する
 * （`notificationsRunChecks.ts` / `notificationsEmergency.ts` / `seed/ops.ts` 参照）。
 * `internalRouteFor` は本文中リンク（relationTo ベース）用のため別関数として用意する。
 */
export type ParsedNotificationLink = { path: string; tournamentId?: number; playerId?: number }

export const parseNotificationDeepLink = (
  deepLink: string | null | undefined,
): ParsedNotificationLink | undefined => {
  if (!deepLink) return undefined
  const m = /^jtour:\/\/([a-z0-9_-]+)\/(\d+)(?:\?player=(\d+))?$/i.exec(deepLink)
  if (!m) return undefined
  const [, kind, id, playerId] = m
  const tournamentId = Number(id)
  const parsedPlayerId = playerId ? Number(playerId) : undefined

  switch (kind) {
    case 'leaderboard':
      return { path: `/tournament/${id}/leaderboard`, tournamentId, playerId: parsedPlayerId }
    case 'tournament':
      return { path: `/tournament/${id}`, tournamentId }
    case 'player':
      return { path: `/player/${id}`, playerId: Number(id) }
    case 'video':
      return { path: `/video/${id}` }
    case 'news':
      return { path: `/news/${id}` }
    default:
      return undefined
  }
}
