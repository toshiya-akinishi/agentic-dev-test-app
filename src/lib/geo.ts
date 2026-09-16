/**
 * 緯度経度の簡易ユーティリティ（T-12-2 / 補-2-9-2）。
 *
 * 動画詳細のミニマップは EP-11 ショットビュー（1-42）の簡易プレビュー版であり、
 * 3D/実測ではなく「ホール俯瞰図上に打点→停止点の線」を描くだけの SIMPL 実装。
 * ホールの `bounds`（南西/北東の矩形）が取れる場合はそれで正規化座標に変換し、
 * 取れない場合は 2 点の方位・距離だけからおおよその位置関係を組み立てる
 * （フォールバック。実際のコース形状は反映しない）。
 */

export type LatLng = { lat: number; lng: number }
export type Bounds = { swLat: number; swLng: number; neLat: number; neLng: number }

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

export const hasLatLng = (p: { lat?: number | null; lng?: number | null } | null | undefined): p is LatLng =>
  typeof p?.lat === 'number' && typeof p?.lng === 'number'

type NullableBounds = {
  swLat?: number | null
  swLng?: number | null
  neLat?: number | null
  neLng?: number | null
}

export const hasBounds = (b: NullableBounds | null | undefined): b is Bounds =>
  typeof b?.swLat === 'number' &&
  typeof b?.swLng === 'number' &&
  typeof b?.neLat === 'number' &&
  typeof b?.neLng === 'number'

/** bounds 矩形内での正規化座標（0..1）。y は北が上になるよう反転する */
export const projectInBounds = (bounds: Bounds, p: LatLng): { x: number; y: number } => {
  const dLat = bounds.neLat - bounds.swLat || 1e-6
  const dLng = bounds.neLng - bounds.swLng || 1e-6
  return {
    x: clamp01((p.lng - bounds.swLng) / dLng),
    y: clamp01(1 - (p.lat - bounds.swLat) / dLat),
  }
}

const toRad = (deg: number): number => (deg * Math.PI) / 180
const toDeg = (rad: number): number => (rad * 180) / Math.PI

/** 2 点間の距離（メートル・Haversine） */
export const haversineMeters = (a: LatLng, b: LatLng): number => {
  const R = 6_371_000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const la1 = toRad(a.lat)
  const la2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const metersToYards = (m: number): number => m * 1.0936133

/** a → b の方位角（0=北、時計回り） */
const bearingDeg = (a: LatLng, b: LatLng): number => {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat))
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/**
 * ホールの bounds が無い場合のフォールバック。
 * 打点を固定位置に置き、停止点は方位・距離（250Y=ドライバー飛距離目安で正規化）から
 * 見た目上の方向感だけを表現する（実際のコース形状・縮尺は反映しない簡易表現）。
 */
export const projectStandalone = (
  start: LatLng,
  end: LatLng,
): { start: { x: number; y: number }; end: { x: number; y: number } } => {
  const meters = haversineMeters(start, end)
  const bearing = bearingDeg(start, end)
  const rad = toRad(bearing)
  const maxR = 0.36
  const scale = 0.35 + 0.65 * Math.min(1, meters / 230)
  const dx = Math.sin(rad) * maxR * scale
  const dy = -Math.cos(rad) * maxR * scale
  const s = { x: 0.5, y: 0.74 }
  const e = { x: clamp01(0.5 + dx), y: clamp01(0.74 + dy) }
  return { start: s, end: e }
}
