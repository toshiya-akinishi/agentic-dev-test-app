/**
 * エリア別成功確率ヒートマップの簡易ゾーン形状（T-11-12 / 補-1-47-1, 補-1-47-2）。
 *
 * `hole-statistics` はゾーン種別（fw_left/center/right, rough_left/right, bunker, green）ごとの
 * 事前集計値しか持たず、実際のポリゴン形状は保持していない。SIMPL 実装として、ティー→グリーンの
 * 軸に沿った帯状の概形をコース図の上に重ねる（正確な形状の再現や実時間計算は行わない）。
 */
import type { HoleStatistic } from '../../types/payload'

export type Pt = { x: number; y: number }
export type Zone = HoleStatistic['zone']

const along = (tee: Pt, green: Pt, t: number): Pt => ({
  x: tee.x + (green.x - tee.x) * t,
  y: tee.y + (green.y - tee.y) * t,
})

/** ティー→グリーン方向に垂直な単位ベクトル */
const perpUnit = (tee: Pt, green: Pt): Pt => {
  const dx = green.x - tee.x
  const dy = green.y - tee.y
  const len = Math.hypot(dx, dy) || 1e-6
  return { x: -dy / len, y: dx / len }
}

const offset = (p: Pt, perp: Pt, w: number): Pt => ({ x: p.x + perp.x * w, y: p.y + perp.y * w })

/** ティー→グリーン軸上の [t0,t1] × 法線方向 [wLo,wHi] の帯を四角形として返す */
const band = (tee: Pt, green: Pt, t0: number, t1: number, wLo: number, wHi: number): Pt[] => {
  const perp = perpUnit(tee, green)
  const a0 = along(tee, green, t0)
  const a1 = along(tee, green, t1)
  return [offset(a0, perp, wLo), offset(a1, perp, wLo), offset(a1, perp, wHi), offset(a0, perp, wHi)]
}

export type ZoneShape = { zone: Zone; kind: 'polygon' | 'circle'; points?: Pt[]; center?: Pt; radius?: number }

/**
 * ティー座標・グリーン座標から 7 ゾーンの概形を組み立てる（補-1-47-1: 実時間計算は行わない静的レイアウト）。
 * フェアウェイ帯（中央/左右）とラフ（左右）はティー〜グリーン軸に沿った帯、
 * バンカーはグリーン手前の一角、グリーンはグリーン中心の円として近似する。
 */
export const buildZoneShapes = (tee: Pt, green: Pt): ZoneShape[] => [
  { zone: 'fw_center', kind: 'polygon', points: band(tee, green, 0.15, 0.85, -0.05, 0.05) },
  { zone: 'fw_left', kind: 'polygon', points: band(tee, green, 0.15, 0.85, -0.14, -0.05) },
  { zone: 'fw_right', kind: 'polygon', points: band(tee, green, 0.15, 0.85, 0.05, 0.14) },
  { zone: 'rough_left', kind: 'polygon', points: band(tee, green, 0.12, 0.88, -0.22, -0.14) },
  { zone: 'rough_right', kind: 'polygon', points: band(tee, green, 0.12, 0.88, 0.14, 0.22) },
  { zone: 'bunker', kind: 'polygon', points: band(tee, green, 0.8, 0.9, 0.06, 0.16) },
  { zone: 'green', kind: 'circle', center: green, radius: 0.06 },
]

export const ZONE_LABELS: Record<Zone, string> = {
  fw_left: 'フェアウェイ左',
  fw_center: 'フェアウェイ中央',
  fw_right: 'フェアウェイ右',
  rough_left: 'ラフ左',
  rough_right: 'ラフ右',
  bunker: 'バンカー',
  green: 'グリーン',
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const rgbToHex = ([r, g, b]: [number, number, number]): string =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`

/** Birdie% (0-100) → 赤(低)〜黄(中)〜緑(高) のヒートカラー */
export const heatColor = (birdieRate: number | null | undefined): string => {
  if (birdieRate === null || birdieRate === undefined) return '#D8DBDF' // データなし = ニュートラルグレー
  const t = Math.min(1, Math.max(0, birdieRate / 100))
  const low = hexToRgb('#D1343C')
  const mid = hexToRgb('#E8912A')
  const high = hexToRgb('#1E8E3E')
  if (t < 0.5) {
    const u = t / 0.5
    return rgbToHex([lerp(low[0], mid[0], u), lerp(low[1], mid[1], u), lerp(low[2], mid[2], u)])
  }
  const u = (t - 0.5) / 0.5
  return rgbToHex([lerp(mid[0], high[0], u), lerp(mid[1], high[1], u), lerp(mid[2], high[2], u)])
}
