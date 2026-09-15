/** 表示フォーマッタ（T-04-8）。スコア・順位の表記は全画面でここに統一する。 */
import { colors } from '../theme'

/** 対パーを `-5` / `E` / `+2` 形式で返す */
export const formatToPar = (toPar: number | null | undefined): string => {
  if (toPar === null || toPar === undefined) return '-'
  if (toPar === 0) return 'E'
  return toPar > 0 ? `+${toPar}` : `${toPar}`
}

/** 対パーに応じた色 */
export const toParColor = (toPar: number | null | undefined): string => {
  if (toPar === null || toPar === undefined) return colors.textMuted
  if (toPar < 0) return colors.under
  if (toPar > 0) return colors.over
  return colors.even
}

/** 順位を `T3` 形式で返す（補-3-1-4） */
export const formatPosition = (
  position: number | null | undefined,
  tied?: boolean | null,
  status?: string | null,
): string => {
  if (status === 'cut') return 'CUT'
  if (status === 'wd') return 'WD'
  if (status === 'dq') return 'DQ'
  if (!position) return '-'
  return tied ? `T${position}` : `${position}`
}

/** ホール結果の表示種別（補-3-2-1 の色分け慣例） */
export type HoleResult = 'eagle' | 'birdie' | 'par' | 'bogey' | 'double_or_worse'

export const holeResultOf = (strokes: number, par: number): HoleResult => {
  const d = strokes - par
  if (d <= -2) return 'eagle'
  if (d === -1) return 'birdie'
  if (d === 0) return 'par'
  if (d === 1) return 'bogey'
  return 'double_or_worse'
}

/** スルーの表記（18 なら F） */
export const formatThru = (thru: number | null | undefined, status?: string | null): string => {
  if (status === 'cut' || status === 'wd' || status === 'dq') return '-'
  if (thru === null || thru === undefined) return '-'
  return thru >= 18 ? 'F' : `${thru}`
}

/** 賞金額（円） */
export const formatMoney = (yen: number | null | undefined): string => {
  if (yen === null || yen === undefined) return '-'
  return `${yen.toLocaleString('ja-JP')}円`
}

/** 賞金額（万円単位の省略表記） */
export const formatMoneyShort = (yen: number | null | undefined): string => {
  if (yen === null || yen === undefined) return '-'
  if (yen >= 100_000_000) return `${(yen / 100_000_000).toFixed(2)}億円`
  if (yen >= 10_000) return `${Math.round(yen / 10_000).toLocaleString('ja-JP')}万円`
  return `${yen.toLocaleString('ja-JP')}円`
}

const WD = ['日', '月', '火', '水', '木', '金', '土']

export const formatDate = (iso: string | Date | null | undefined): string => {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`
}

export const formatDateFull = (iso: string | Date | null | undefined): string => {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WD[d.getDay()]})`
}

export const formatTime = (iso: string | Date | null | undefined): string => {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 大会期間（例 9/12(木)〜9/15(日)） */
export const formatDateRange = (
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
): string => {
  if (!start || !end) return '-'
  return `${formatDate(start)}〜${formatDate(end)}`
}

/** 相対時刻（通知センター 6-17 用） */
export const formatRelative = (iso: string | Date | null | undefined): string => {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'たった今'
  if (min < 60) return `${min}分前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}時間前`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day}日前`
  return formatDate(iso)
}

/** 秒 → mm:ss */
export const formatDuration = (sec: number | null | undefined): string => {
  if (!sec) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** 距離（ヤード） */
export const formatYards = (y: number | null | undefined): string =>
  y === null || y === undefined ? '-' : `${Math.round(y)}Y`
