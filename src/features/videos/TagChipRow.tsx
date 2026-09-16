/**
 * タグ検索・タグチップ UI（T-12-3 / 要求 2-10 / 補-2-10-1: 8 種）。
 * 動画一覧のフィルタ軸としても、動画詳細のタグ表示としても使う。
 */
import React from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { VIDEO_TAG_OPTIONS, videoTagLabel } from '../../queries/videos'
import { colors, radius, space } from '../../theme'

export const TagChipRow = ({
  value,
  onChange,
  showAllOption = true,
}: {
  value?: string
  onChange: (tag?: string) => void
  showAllOption?: boolean
}) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {showAllOption ? (
      <Chip label="すべて" active={!value} onPress={() => onChange(undefined)} />
    ) : null}
    {VIDEO_TAG_OPTIONS.map((t) => (
      <Chip
        key={t.value}
        label={t.label}
        active={value === t.value}
        onPress={() => onChange(value === t.value ? undefined : t.value)}
      />
    ))}
  </ScrollView>
)

const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Txt size="xs" weight="bold" color={active ? colors.textInverse : colors.textSub}>
      {label}
    </Txt>
  </Pressable>
)

/** 動画詳細でのタグ表示（タップで動画一覧をそのタグで絞り込む） */
export const TagBadgeRow = ({ tags, onPressTag }: { tags: string[]; onPressTag?: (tag: string) => void }) => {
  if (!tags.length) return null
  return (
    <View style={[styles.row, { paddingHorizontal: 0 }]}>
      {tags.map((tag) => (
        <Pressable key={tag} onPress={() => onPressTag?.(tag)} disabled={!onPressTag}>
          <View style={[styles.chip, styles.chipStatic]}>
            <Txt size="xs" weight="bold" color={colors.primary}>
              {videoTagLabel(tag)}
            </Txt>
          </View>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs, paddingHorizontal: space.lg },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSubtle,
  },
  chipActive: { backgroundColor: colors.primary },
  chipStatic: { backgroundColor: '#EAF3EC' },
})
