/**
 * 広告枠のデータ取得フック（8-3, 8-5 / docs/03-api-spec.md 3章）。
 * ホーム画面の `home_top_banner` / `home_inline` 枠から利用する。
 * 補-8-5-1: クリエイティブ未設定時は枠を非表示にする（呼び出し側で data が null/undefined なら何も描画しない）。
 *
 * 計測（8-6: インプレッション/クリック計測、8-4: スポンサーレポート）は EP-15 の範囲のため未実装。
 */
import { useCustom } from './hooks'
import { qk } from './keys'
import type { AdCreative } from '../types/payload'

export const useAdSlot = (
  slot: string,
  ctx?: { tournamentId?: string; playerId?: string },
) =>
  useCustom<AdCreative | null>(qk.ad(slot, ctx), '/api/ads/serve', {
    slot,
    tournamentId: ctx?.tournamentId,
    playerId: ctx?.playerId,
  })
