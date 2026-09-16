/** 大会一覧のカレンダービュー（1-3, 1-4 / 補-1-3-1, 補-1-4-1） */
import React, { useMemo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { buildMonthGrid, isSameDay } from '../../lib/calendar'
import { colors, radius, space } from '../../theme'
import type { Tournament } from '../../types/payload'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
/** 補-1-4-1: 1日に複数大会が並ぶ場合は最大2件表示 + 「他 n件」 */
const MAX_PER_DAY = 2

export const TournamentCalendar = ({
  month,
  onChangeMonth,
  tournaments,
  onSelectDay,
}: {
  month: Date
  onChangeMonth: (next: Date) => void
  tournaments: Tournament[]
  onSelectDay: (day: Date, dayTournaments: Tournament[]) => void
}) => {
  const cells = useMemo(() => buildMonthGrid(month, tournaments), [month, tournaments])
  const today = new Date()

  return (
    <View>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        >
          <Txt size="lg">‹</Txt>
        </Pressable>
        <Txt weight="bold" size="lg">
          {month.getFullYear()}年{month.getMonth() + 1}月
        </Txt>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        >
          <Txt size="lg">›</Txt>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <Txt key={w} size="xs" color={colors.textMuted} style={styles.weekCell}>
            {w}
          </Txt>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => {
          const shown = cell.tournaments.slice(0, MAX_PER_DAY)
          const rest = cell.tournaments.length - shown.length
          return (
            <Pressable
              key={cell.date.toISOString()}
              disabled={cell.tournaments.length === 0}
              onPress={() => onSelectDay(cell.date, cell.tournaments)}
              style={[styles.dayCell, !cell.inMonth && styles.dayCellOutside]}
            >
              <Txt
                size="xs"
                weight={isSameDay(cell.date, today) ? 'bold' : 'regular'}
                color={
                  isSameDay(cell.date, today)
                    ? colors.primary
                    : cell.inMonth
                      ? colors.text
                      : colors.textMuted
                }
              >
                {cell.date.getDate()}
              </Txt>
              <View style={{ gap: 2, marginTop: 2 }}>
                {shown.map((t) => (
                  <View key={t.id} style={[styles.pill, t.status === 'live' && styles.pillLive]}>
                    <Txt size="xs" numberOfLines={1} color={t.status === 'live' ? colors.textInverse : colors.text}>
                      {t.name}
                    </Txt>
                  </View>
                ))}
                {rest > 0 ? (
                  <Txt size="xs" color={colors.textMuted}>
                    他{rest}件
                  </Txt>
                ) : null}
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xl,
    paddingVertical: space.md,
  },
  weekRow: { flexDirection: 'row' },
  weekCell: { flex: 1, textAlign: 'center', paddingVertical: space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    minHeight: 64,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  dayCellOutside: { backgroundColor: colors.bgSubtle },
  pill: {
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  pillLive: { backgroundColor: colors.live },
})
