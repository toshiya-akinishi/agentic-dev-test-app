/**
 * 会場マップの施設種別フィルタ（T-08-5 / 補-1-22-2: 複数選択）。
 * 何も選択していない状態は「すべて表示」として扱う。
 */
import React from 'react'
import { Pressable, ScrollView, StyleSheet } from 'react-native'

import { Txt } from '../../components/ui'
import { FACILITY_META, type FacilityType } from '../../lib/venue'
import { colors, radius, space } from '../../theme'

export const FacilityFilterChips = ({
  types,
  selected,
  onToggle,
}: {
  types: FacilityType[]
  selected: string[]
  onToggle: (type: FacilityType) => void
}) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {types.map((type) => {
      const active = selected.includes(type)
      const meta = FACILITY_META[type]
      return (
        <Pressable
          key={type}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          onPress={() => onToggle(type)}
          style={[styles.chip, active && { backgroundColor: meta.color, borderColor: meta.color }]}
        >
          <Txt size="sm">{meta.icon}</Txt>
          <Txt size="sm" weight={active ? 'bold' : 'regular'} color={active ? colors.textInverse : colors.text}>
            {meta.label}
          </Txt>
        </Pressable>
      )
    })}
  </ScrollView>
)

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
})
