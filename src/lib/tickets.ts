/**
 * チケット関連の純粋関数（T-07-8, T-07-9 / 要求 5-1, 5-3）。
 * 画面・フックの両方から参照するため副作用なしで独立させる。
 */
import type { TicketType } from '../types/payload'

/**
 * 補-5-1-3: 販売期間（salesStart〜salesEnd）外、または在庫 0 の券種は購入不可。
 * 期間・在庫が未設定の項目は制限なしとして扱う。
 */
export const isTicketTypeSaleable = (
  t: Pick<TicketType, 'stock' | 'salesStart' | 'salesEnd'>,
  now: number = Date.now(),
): boolean => {
  if (t.stock !== undefined && t.stock !== null && t.stock <= 0) return false
  if (t.salesStart && new Date(t.salesStart).getTime() > now) return false
  if (t.salesEnd && new Date(t.salesEnd).getTime() < now) return false
  return true
}

/** 券種が購入不可の場合の理由（UI 表示用） */
export const ticketTypeUnavailableReason = (
  t: Pick<TicketType, 'stock' | 'salesStart' | 'salesEnd'>,
  now: number = Date.now(),
): string | undefined => {
  if (t.stock !== undefined && t.stock !== null && t.stock <= 0) return '完売しました'
  if (t.salesStart && new Date(t.salesStart).getTime() > now) return '販売開始前です'
  if (t.salesEnd && new Date(t.salesEnd).getTime() < now) return '販売を終了しました'
  return undefined
}

/**
 * 補-5-3-1: 電子チケットの「有効」判定。
 * `status=paid` かつ `validDate` が当日中またはそれ以降（未設定なら期限なし扱い）。
 */
export const isTicketOrderValid = (
  status: 'pending' | 'paid' | 'cancelled' | 'used',
  validDate: string | null | undefined,
  now: number = Date.now(),
): boolean => {
  if (status !== 'paid') return false
  if (!validDate) return true
  const end = new Date(validDate)
  end.setHours(23, 59, 59, 999)
  return end.getTime() >= now
}

/** 補-5-1-4: MOCK 決済の注文番号・決済参照ID。外部決済への差し替え点はこの2関数に隔離する */
export const generateOrderNo = (): string => {
  const stamp = Date.now().toString(36).toUpperCase()
  const rand = Math.floor(100 + Math.random() * 900)
  return `JT-${stamp}-${rand}`
}

export const generateMockPaymentRef = (): string =>
  `MOCK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`

/** 補-5-3-2: QR に埋め込むペイロード（注文番号ベース） */
export const buildQrPayload = (orderNo: string): string => `jtour-ticket:${orderNo}`
