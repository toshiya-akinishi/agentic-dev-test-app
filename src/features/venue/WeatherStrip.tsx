/**
 * 天候予報（T-08-11 / 1-24 / 補-1-24-1〜3・SIMPL）。
 * 「今日/明日/明後日」タブ + 1時間毎の横スクロール。天候アイコン・気温・降水確率・風向(矢印)・風速。
 * データ源は外部気象APIではなくCMS投入値（`weather-forecasts`）。取得は `useWeatherForecasts` の1箇所に集約。
 */
import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { Card, Tabs, Txt } from '../../components/ui'
import { formatTime } from '../../lib/format'
import { WEATHER_ICON, WIND_DIRECTION_DEG, dayLabelOf, groupWeatherByDay } from '../../lib/venue'
import { colors, radius, space } from '../../theme'
import type { WeatherForecast } from '../../types/payload'

export const WeatherStrip = ({ forecasts }: { forecasts: WeatherForecast[] }) => {
  const days = useMemo(() => groupWeatherByDay(forecasts), [forecasts])
  const [dayIndex, setDayIndex] = useState(0)
  if (!days.length) return null

  const active = days[Math.min(dayIndex, days.length - 1)]

  return (
    <Card style={{ gap: space.md, paddingHorizontal: 0 }}>
      <Txt weight="bold" style={{ paddingHorizontal: space.lg }}>
        天候（1時間ごと・3日先まで）
      </Txt>

      <View style={{ paddingHorizontal: space.lg }}>
        <Tabs
          value={String(dayIndex)}
          onChange={(v) => setDayIndex(Number(v))}
          options={days.map((d, i) => ({ value: String(i), label: dayLabelOf(d.key, i) }))}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {active.items.map((f) => (
          <View key={f.id} style={styles.cell}>
            <Txt size="xs" color={colors.textSub}>
              {formatTime(f.forecastFor)}
            </Txt>
            <Txt size="lg">{WEATHER_ICON[f.condition]}</Txt>
            <Txt size="sm" weight="bold">
              {typeof f.temperature === 'number' ? `${Math.round(f.temperature)}℃` : '-'}
            </Txt>
            <Txt size="xs" color={colors.info}>
              💧{typeof f.precipProbability === 'number' ? `${f.precipProbability}%` : '-'}
            </Txt>
            <View style={styles.windRow}>
              {f.windDirection ? (
                <Txt size="sm" style={{ transform: [{ rotate: `${WIND_DIRECTION_DEG[f.windDirection]}deg` }] }}>
                  ↑
                </Txt>
              ) : null}
              <Txt size="xs" color={colors.textMuted}>
                {typeof f.windSpeed === 'number' ? `${f.windSpeed}m/s` : '-'}
              </Txt>
            </View>
          </View>
        ))}
      </ScrollView>
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg },
  cell: {
    width: 64,
    alignItems: 'center',
    gap: 2,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bgSubtle,
  },
  windRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
})
