/**
 * 会場マップ・コース情報まわりの純粋関数（EP-08 / 要求 1-16, 1-22, 1-24, 1-30, 1-31）。
 */
import { haversineMeters, type LatLng } from './geo'
import type { TransportInfo, WeatherForecast } from '../types/payload'

/* ---------------- 施設ピン種別（補-1-22-1） ---------------- */

export type FacilityType = 'toilet' | 'food' | 'goods' | 'firstaid' | 'entrance' | 'info' | 'smoking' | 'atm'

export const FACILITY_TYPES: FacilityType[] = [
  'toilet',
  'food',
  'goods',
  'firstaid',
  'entrance',
  'info',
  'smoking',
  'atm',
]

export const FACILITY_META: Record<FacilityType, { label: string; icon: string; color: string }> = {
  toilet: { label: 'トイレ', icon: '🚻', color: '#2563C9' },
  food: { label: '飲食', icon: '🍴', color: '#E8912A' },
  goods: { label: 'グッズ', icon: '🛍️', color: '#C8306B' },
  firstaid: { label: '救護所', icon: '⛑️', color: '#D1343C' },
  entrance: { label: '入場ゲート', icon: '🚩', color: '#0B5D2E' },
  info: { label: '案内所', icon: 'ℹ️', color: '#8B45C9' },
  smoking: { label: '喫煙所', icon: '🚬', color: '#5C6268' },
  atm: { label: 'ATM', icon: '💴', color: '#1E8E3E' },
}

/** 補-1-25-1: グルメ・お土産タブの対象 */
export const GOURMET_FACILITY_TYPES: FacilityType[] = ['food', 'goods']

/* ---------------- 会場外判定（補-1-30-2） ---------------- */

/**
 * Venue は中心座標（`location`）のみを持ち、矩形バウンディングボックスを持たない。
 * 「会場外にいます」判定は、会場中心からの半径で近似する（ゴルフ場1件分の目安として 1.5km）。
 * 正確なポリゴン境界は CMS 側にデータが無いための簡易実装。
 */
export const VENUE_OUTSIDE_RADIUS_M = 1500

export const isOutsideVenue = (
  venueLocation: LatLng,
  userLocation: LatLng,
  radiusM = VENUE_OUTSIDE_RADIUS_M,
): boolean => haversineMeters(venueLocation, userLocation) > radiusM

/* ---------------- ギャラリーバス「次の発車」強調（補-1-15-1） ---------------- */

const minutesOf = (time: string): number | undefined => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!m) return undefined
  return Number(m[1]) * 60 + Number(m[2])
}

/** 現在時刻以降で最も近い時刻表エントリの index（無ければ -1） */
export const nextDepartureIndex = <T extends { time: string }>(
  timetable: T[] | null | undefined,
  now: Date = new Date(),
): number => {
  if (!timetable?.length) return -1
  const nowMin = now.getHours() * 60 + now.getMinutes()
  let best = -1
  let bestDiff = Number.POSITIVE_INFINITY
  timetable.forEach((entry, i) => {
    const min = minutesOf(entry.time)
    if (min === undefined) return
    const diff = min - nowMin
    if (diff >= 0 && diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  })
  return best
}

/* ---------------- 駐車場 混雑ステータス（補-1-16-2） ---------------- */

export const OCCUPANCY_META: Record<
  NonNullable<TransportInfo['occupancyStatus']>,
  { label: string; color: string; bg: string }
> = {
  vacant: { label: '空き', color: '#FFF', bg: '#1E8E3E' },
  crowded: { label: '混雑', color: '#FFF', bg: '#E8912A' },
  full: { label: '満車', color: '#FFF', bg: '#D1343C' },
}

/* ---------------- 天候（補-1-24-1, 2） ---------------- */

export const WEATHER_ICON: Record<WeatherForecast['condition'], string> = {
  sunny: '☀️',
  partly_cloudy: '⛅',
  cloudy: '☁️',
  rain: '🌧️',
  heavy_rain: '⛈️',
  thunder: '🌩️',
  snow: '❄️',
  fog: '🌫️',
}

/** 風向 → 矢印アイコンの回転角（N=0度・時計回り。矢印は風が吹いていく向きを指す） */
export const WIND_DIRECTION_DEG: Record<NonNullable<WeatherForecast['windDirection']>, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
}

/** 予報を「今日/明日/明後日」の日付キー（YYYY-MM-DD、ローカル時刻）でグルーピングする */
export const dayKeyOf = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const groupWeatherByDay = (forecasts: WeatherForecast[]): Array<{ key: string; items: WeatherForecast[] }> => {
  const map = new Map<string, WeatherForecast[]>()
  for (const f of [...forecasts].sort((a, b) => a.forecastFor.localeCompare(b.forecastFor))) {
    const key = dayKeyOf(f.forecastFor)
    const list = map.get(key) ?? []
    list.push(f)
    map.set(key, list)
  }
  return Array.from(map.entries()).map(([key, items]) => ({ key, items }))
}

export const dayLabelOf = (key: string, index: number): string => {
  if (index === 0) return '今日'
  if (index === 1) return '明日'
  if (index === 2) return '明後日'
  const [, m, d] = key.split('-')
  return `${Number(m)}/${Number(d)}`
}

/* ---------------- 選手位置のフォールバック（補-1-31-4） ---------------- */

export const STALE_POSITION_MS = 5 * 60 * 1000

export const isStalePosition = (recordedAt: string, now: number = Date.now()): boolean =>
  now - new Date(recordedAt).getTime() > STALE_POSITION_MS
