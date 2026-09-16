/**
 * 弾道描画の純関数（T-11-2 / 補-1-42-2）。
 * 打点→停止点の 2 次ベジェ曲線。高さ係数（≒左右の曲がり量）はショット種別で変える
 * （tee/approach=高、putt=直線）。`src/lib/geo.ts` の座標変換結果（0..1 正規化）を受け取り、
 * SVG 座標（0..size）の path 文字列を返す。
 */
import type { Shot } from '../../types/payload'

export type Point = { x: number; y: number }

/** 補-1-42-2: ショット種別ごとの曲線の高さ係数（コリドー長に対する比率） */
const CURVE_COEFFICIENT: Record<Shot['shotType'], number> = {
  tee: 0.22,
  approach: 0.16,
  recovery: 0.14,
  bunker: 0.1,
  penalty: 0.06,
  putt: 0,
}

/**
 * 打点→停止点の 2 次ベジェ曲線の制御点。線分中点から法線方向へオフセットする。
 * `sign` で曲がる向きを指定する（同一ホール上で複数選手・複数打を見分けやすくするため
 * 呼び出し側で選手ごとに交互に渡す）。
 */
export const trajectoryControlPoint = (start: Point, end: Point, shotType: Shot['shotType'], sign: 1 | -1): Point => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const dist = Math.hypot(dx, dy) || 1e-6
  const nx = -dy / dist
  const ny = dx / dist
  const offset = dist * (CURVE_COEFFICIENT[shotType] ?? 0.15) * sign
  return { x: (start.x + end.x) / 2 + nx * offset, y: (start.y + end.y) / 2 + ny * offset }
}

/** SVG の `d` 属性（2 次ベジェ）。`size` は正規化座標(0..1)を掛けるビューポート一辺の長さ */
export const trajectoryPathD = (start: Point, end: Point, shotType: Shot['shotType'], sign: 1 | -1, size: number): string => {
  const c = trajectoryControlPoint(start, end, shotType, sign)
  return `M ${start.x * size} ${start.y * size} Q ${c.x * size} ${c.y * size} ${end.x * size} ${end.y * size}`
}
