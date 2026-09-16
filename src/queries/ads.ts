/**
 * 広告枠のデータ取得フック（8-3, 8-5, 8-6 / docs/03-api-spec.md 3章 / T-15-2, T-15-3）。
 * `GET /api/ads/serve?slot=&tournamentId=&playerId=` を叩き、配信対象が無ければ
 * `{ slot, creative: null }` が 200 で返る（補-8-5-1: 呼び出し側は枠ごと非表示にする）。
 *
 * レスポンスの `creative` は CMS 内部の `AdCreative`（`src/types/payload.ts`）とは形が異なり、
 * 選ばれた 1 件だけを配信用に整形したものが返る（`format` に応じて banner/video/article の
 * いずれか 1 つだけ値が入り、他は null）。そのためこのファイル専用の型を持つ。
 */
import { useCustom } from './hooks'
import { qk } from './keys'

export type AdServeSponsor = {
  id: number | string
  name?: string
  logoUrl?: string | null
}

export type AdServeBanner = {
  imageUrl?: string
  alt?: string | null
} | null

export type AdServeVideo = {
  id: number | string
  title?: string | null
  hlsUrl?: string | null
  fileUrl?: string | null
  durationSec?: number | null
} | null

export type AdServeArticle = {
  id: number | string
  title?: string | null
  slug?: string | null
} | null

export type AdServeCreative = {
  id: number | string
  name: string
  format: 'banner' | 'video' | 'tieup_article'
  sponsor: AdServeSponsor
  banner: AdServeBanner
  video: AdServeVideo
  article: AdServeArticle
  linkUrl?: string | null
  targeting?: { tournamentId: number | null; playerId: number | null }
}

export type AdServeResponse = {
  slot: string
  creative: AdServeCreative | null
}

/** 補-8-3-1: Ph1 の 5 枠 */
export type AdSlotKey =
  | 'home_top_banner'
  | 'home_inline'
  | 'leaderboard_inline'
  | 'video_pre'
  | 'tournament_detail_banner'

export const useAdSlot = (
  slot: AdSlotKey | string,
  ctx?: { tournamentId?: string | number; playerId?: string | number },
) =>
  useCustom<AdServeResponse>(qk.ad(slot, ctx), '/api/ads/serve', {
    slot,
    tournamentId: ctx?.tournamentId !== undefined ? String(ctx.tournamentId) : undefined,
    playerId: ctx?.playerId !== undefined ? String(ctx.playerId) : undefined,
  })
