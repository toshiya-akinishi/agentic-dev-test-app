/**
 * Trackman 計測パネル（T-11-10 / 1-39 / 補-1-39-1, 補-1-39-2）。
 * MOCK: 実機材連携は行わず、値が入っているショットのみ表示する（練習場カテゴリのショットのみ想定）。
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { colors, space } from '../../theme'
import type { Shot } from '../../types/payload'

const FIELDS: Array<{ key: keyof NonNullable<Shot['trackman']>; label: string; unit: string }> = [
  { key: 'ballSpeed', label: 'ボール初速', unit: 'mph' },
  { key: 'launchAngle', label: '打ち出し角', unit: '°' },
  { key: 'spinRate', label: 'スピン量', unit: 'rpm' },
  { key: 'apexHeight', label: '最高到達点', unit: 'y' },
]

/** 補-1-39-1: 値が 1 つも無ければ非表示にする（呼び出し側で存在チェックにも使う） */
export const hasTrackmanData = (shot: Shot): boolean =>
  FIELDS.some((f) => typeof shot.trackman?.[f.key] === 'number')

export const TrackmanPanel = ({ shot }: { shot: Shot }) => {
  if (!hasTrackmanData(shot)) return null

  return (
    <View style={styles.wrap}>
      <Txt size="sm" weight="bold" color={colors.textSub}>
        Trackman 計測データ
      </Txt>
      <Txt size="xs" color={colors.textMuted} style={{ marginTop: 2 }}>
        練習場での計測値です（MOCK・実機材連携なし）
      </Txt>
      <View style={styles.grid}>
        {FIELDS.map((f) => {
          const v = shot.trackman?.[f.key]
          if (typeof v !== 'number') return null
          return (
            <View key={f.key} style={styles.cell}>
              <Txt size="xs" color={colors.textSub}>
                {f.label}
              </Txt>
              <Txt weight="bold" size="lg">
                {Math.round(v * 10) / 10}
                <Txt size="xs" color={colors.textMuted}> {f.unit}</Txt>
              </Txt>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.md, padding: space.md, backgroundColor: colors.bgSubtle, borderRadius: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  cell: { width: '46%', gap: 2 },
})
