/**
 * コース詳細の18ホール一覧・1行（T-08-9 / 1-19 / 補-1-19-1）。
 * No / Par / ヤード / ハンディキャップを表示する。
 */
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { colors, radius, space } from '../../theme'
import type { Hole } from '../../types/payload'

export const CourseHoleListRow = ({ hole, onPress }: { hole: Hole; onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
  >
    <View style={styles.numberWrap}>
      <Txt weight="bold">{hole.number}</Txt>
    </View>
    <View style={{ flex: 1 }}>
      <Txt weight="medium">Par {hole.par}</Txt>
      <Txt size="xs" color={colors.textMuted}>
        {hole.yards}Y{typeof hole.handicap === 'number' ? ` ・ HDCP ${hole.handicap}` : ''}
      </Txt>
    </View>
    <Txt color={colors.textMuted}>›</Txt>
  </Pressable>
)

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  numberWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
