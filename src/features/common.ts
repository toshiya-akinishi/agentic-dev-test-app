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
  if (!url) return undefined
  return /^https?:\/\//.test(url) ? url : `${API_URL}${url}`
}

/** Payload の `in` 演算子はカンマ区切り文字列で渡す（docs/03-api-spec.md 2章） */
export const commaList = (ids: Array<number | string>): string => ids.join(',')
