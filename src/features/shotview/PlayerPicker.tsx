/**
 * 選手選択チップ（T-11-4 / 補-1-43-1）。お気に入り選手から最大4名を選択する（ADR-007 の上限を踏襲）。
 * 選択順を色分けの並び順に使うため、選択済みは選択順で表示し、末尾に未選択の候補を並べる。
 */
import React from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { colors, playerColorAt, radius, space } from '../../theme'
import type { Player } from '../../types/payload'

export const PlayerPicker = ({
  favoritePlayers,
  selectedIds,
  onToggle,
  max,
}: {
  favoritePlayers: Player[]
  /** 選択順（先頭ほど早く選ばれた選手。色分け・凡例の並びに使う） */
  selectedIds: number[]
  onToggle: (playerId: number) => void
  max: number
}) => {
  const selectedSet = new Set(selectedIds)
  const ordered = [
    ...selectedIds.map((id) => favoritePlayers.find((p) => p.id === id)).filter((p): p is Player => Boolean(p)),
    ...favoritePlayers.filter((p) => !selectedSet.has(p.id)),
  ]

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {ordered.map((p) => {
        const colorIndex = selectedIds.indexOf(p.id)
        const selected = colorIndex >= 0
        const disabled = !selected && selectedIds.length >= max
        return (
          <Pressable
            key={p.id}
            onPress={() => onToggle(p.id)}
            disabled={disabled}
            style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
          >
            {selected ? <View style={[styles.dot, { backgroundColor: playerColorAt(colorIndex) }]} /> : null}
            <Txt size="sm" weight={selected ? 'bold' : 'regular'} color={disabled ? colors.textMuted : colors.text}>
              {p.name}
            </Txt>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

/** 補-1-37-1: 選択中選手の凡例。画面下部に常時表示する */
export const PlayerLegend = ({ players }: { players: Player[] }) => {
  if (!players.length) return null
  return (
    <View style={styles.legendRow}>
      {players.map((p, i) => (
        <View key={p.id} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: playerColorAt(i) }]} />
          <Txt size="xs" weight="medium">
            {p.name}
          </Txt>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.bg, borderColor: colors.primary },
  chipDisabled: { opacity: 0.4 },
  dot: { width: 8, height: 8, borderRadius: 999 },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
})
