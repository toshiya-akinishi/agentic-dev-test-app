/**
 * リーダーボードの絞り込み・検索・比較モード切替（3-1 / 補-3-1-3, 補-3-7-1, 補-3-7-2）。
 */
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Button, Tabs, TextField, Txt } from '../../components/ui'
import { colors, space } from '../../theme'
import type { LeaderboardFilterKind } from '../../queries/leaderboard'
import type { Pairing } from '../../types/payload'

export const LeaderboardFilterBar = ({
  filter,
  onFilterChange,
  pairings,
  selectedGroupNo,
  onSelectGroup,
  search,
  onSearchChange,
  compareMode,
  onToggleCompareMode,
  compareCount,
  onFillFavorites,
}: {
  filter: LeaderboardFilterKind
  onFilterChange: (f: LeaderboardFilterKind) => void
  pairings: Pairing[]
  selectedGroupNo?: number
  onSelectGroup: (groupNo: number) => void
  search: string
  onSearchChange: (v: string) => void
  compareMode: boolean
  onToggleCompareMode: () => void
  compareCount: number
  onFillFavorites: () => void
}) => (
  <View style={styles.wrap}>
    <View style={styles.topRow}>
      <View style={{ flex: 1 }}>
        <Tabs
          value={filter}
          onChange={onFilterChange}
          options={[
            { value: 'all', label: '全体' },
            { value: 'favorites', label: 'お気に入り' },
            { value: 'group', label: '組' },
          ]}
        />
      </View>
      <Button
        title={compareMode ? `比較選択中(${compareCount})` : '選手比較'}
        variant={compareMode ? 'primary' : 'ghost'}
        onPress={onToggleCompareMode}
      />
    </View>

    {filter === 'group' && pairings.length > 0 ? (
      <View style={styles.groupRow}>
        {pairings.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => onSelectGroup(p.groupNo)}
            style={[styles.groupChip, selectedGroupNo === p.groupNo && styles.groupChipActive]}
          >
            <Txt
              size="xs"
              weight="bold"
              color={selectedGroupNo === p.groupNo ? colors.textInverse : colors.textSub}
            >
              第{p.groupNo}組
            </Txt>
          </Pressable>
        ))}
      </View>
    ) : null}

    <View style={styles.searchRow}>
      <TextField
        placeholder="選手名で検索"
        value={search}
        onChangeText={onSearchChange}
        containerStyle={{ flex: 1 }}
      />
      {compareMode ? (
        <Button title="★で比較枠に追加" variant="ghost" onPress={onFillFavorites} />
      ) : null}
    </View>
  </View>
)

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  groupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  groupChip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.bgSubtle,
  },
  groupChipActive: { backgroundColor: colors.primary },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
})
