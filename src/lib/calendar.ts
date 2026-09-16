/** カレンダー表示（補-1-3-1, 補-1-4-1）用の純粋関数。日付ライブラリは使わず Date のみで組む。 */
import type { Season, Tournament } from '../types/payload'

export const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1)

export const addMonths = (d: Date, delta: number): Date =>
  new Date(d.getFullYear(), d.getMonth() + delta, 1)

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export const isSameMonth = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()

/** 大会の開催期間に day が含まれるか（複数日大会をカレンダー上の各日に表示するため） */
const spansDay = (t: Tournament, day: Date): boolean => {
  const start = new Date(t.startDate)
  const end = new Date(t.endDate)
  const d0 = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
  const s0 = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const e0 = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
  return d0 >= s0 && d0 <= e0
}

export type CalendarCell = {
  date: Date
  inMonth: boolean
  tournaments: Tournament[]
}

/**
 * 月単位グリッド（補-1-4-1）。日曜始まり 6 週固定（42マス）でレイアウト崩れを防ぐ。
 * 呼び出し側で 1 日あたり最大 2 件 + 「他 n件」に丸める。
 */
export const buildMonthGrid = (month: Date, tournaments: Tournament[]): CalendarCell[] => {
  const first = startOfMonth(month)
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - first.getDay())

  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + i)
    cells.push({
      date,
      inMonth: isSameMonth(date, month),
      tournaments: tournaments.filter((t) => spansDay(t, date)),
    })
  }
  return cells
}

/** 補-1-3-3: 既定は現行シーズン（今日を含むシーズン）。無ければ最新シーズン */
export const pickCurrentSeason = (seasons: Season[], now: Date = new Date()): Season | undefined => {
  if (!seasons.length) return undefined
  const t = now.getTime()
  const current = seasons.find(
    (s) => new Date(s.startDate).getTime() <= t && new Date(s.endDate).getTime() >= t,
  )
  if (current) return current
  return [...seasons].sort((a, b) => b.year - a.year)[0]
}
