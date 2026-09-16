/**
 * ホールのハザードポリゴン解析（T-11-1 / 補-1-42-1）。
 * `holes.hazards[].polygon` は CMS 上 JSON 自由入力（`[[緯度, 経度], ...]`）のため、
 * 形が保証されていない値を安全にパースしてから `projectInBounds` へ渡す。
 */
import { hasBounds, projectInBounds, type Bounds } from '../../lib/geo'
import type { Hole } from '../../types/payload'

export type HazardKind = 'bunker' | 'water' | 'ob' | 'tree'
export type ProjectedHazard = { id: string; type: HazardKind; points: Array<{ x: number; y: number }> }

const isNumberPair = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number'

/** `[[lat,lng], ...]` を LatLng の配列に変換する。壊れた/空の値は空配列にする */
const parseLatLngPairs = (raw: unknown): Array<{ lat: number; lng: number }> => {
  if (!Array.isArray(raw)) return []
  const out: Array<{ lat: number; lng: number }> = []
  for (const item of raw) {
    if (isNumberPair(item)) out.push({ lat: item[0], lng: item[1] })
  }
  return out
}

/** ホールのハザード一覧を、bounds が取れる場合のみ SVG 正規化座標(0..1)へ変換する */
export const projectHazards = (hole: Hole | undefined): ProjectedHazard[] => {
  if (!hole?.hazards?.length || !hasBounds(hole.bounds)) return []
  const bounds = hole.bounds as Bounds
  const out: ProjectedHazard[] = []
  hole.hazards.forEach((h, i) => {
    const latLngs = parseLatLngPairs(h.polygon)
    if (latLngs.length < 3) return
    out.push({
      id: h.id ?? `hazard-${i}`,
      type: h.type,
      points: latLngs.map((p) => projectInBounds(bounds, p)),
    })
  })
  return out
}

export const HAZARD_STYLE: Record<HazardKind, { fill: string; stroke: string }> = {
  bunker: { fill: '#EDE0C0', stroke: '#C9B77A' },
  water: { fill: '#B7D3EE', stroke: '#5E9BD6' },
  ob: { fill: 'transparent', stroke: '#D1343C' },
  tree: { fill: '#BFD8BE', stroke: '#7FA97E' },
}
