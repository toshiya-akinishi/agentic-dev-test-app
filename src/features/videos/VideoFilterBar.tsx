/**
 * 動画一覧の 6 軸フィルタ + 並び順（T-12-1 / 補-2-8-1〜3）。
 * 軸: 大会 / ラウンド / 選手 / ホール / ショット種別 / タグ（AND 条件・複数組み合わせ可）。
 * フィルタ状態は呼び出し側（画面）が Jotai atom で保持する（補-2-8-3）。
 */
import React, { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { Button, Sheet, Tabs, TextField, Txt } from '../../components/ui'
import { normalizeForSearch } from '../guide/search'
import { useAllPlayersForFilter, useAllTournamentsForFilter, SHOT_TYPE_OPTIONS, SORT_OPTIONS } from '../../queries/videos'
import { useTournamentRounds } from '../../queries/tournaments'
import { colors, radius, space } from '../../theme'
import type { VideoFilters } from '../../store/ui'
import { TagChipRow } from './TagChipRow'

const HOLES = Array.from({ length: 18 }, (_, i) => i + 1)

const activeAxisCount = (f: VideoFilters): number =>
  [f.tournament, f.round, f.player, f.hole, f.shotType].filter((v) => v !== undefined && v !== '').length

export const VideoFilterBar = ({
  filters,
  onChange,
}: {
  filters: VideoFilters
  onChange: (next: VideoFilters) => void
}) => {
  const [sheetOpen, setSheetOpen] = useState(false)
  const activeCount = activeAxisCount(filters)

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Tabs
          value={filters.sort}
          onChange={(v) => onChange({ ...filters, sort: v })}
          options={[...SORT_OPTIONS]}
        />
        <Button
          title={activeCount > 0 ? `絞り込み中(${activeCount})` : '詳細フィルタ'}
          variant={activeCount > 0 ? 'primary' : 'ghost'}
          onPress={() => setSheetOpen(true)}
        />
      </View>

      <TagChipRow value={filters.tag} onChange={(tag) => onChange({ ...filters, tag })} />

      <FilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onChange={onChange}
      />
    </View>
  )
}

const FilterSheet = ({
  visible,
  onClose,
  filters,
  onChange,
}: {
  visible: boolean
  onClose: () => void
  filters: VideoFilters
  onChange: (next: VideoFilters) => void
}) => {
  const [playerQuery, setPlayerQuery] = useState('')
  const { data: tournamentsData } = useAllTournamentsForFilter()
  const { data: roundsData } = useTournamentRounds(filters.tournament)
  const { data: playersData } = useAllPlayersForFilter()

  const tournaments = tournamentsData?.docs ?? []
  const rounds = roundsData?.docs ?? []
  const players = useMemo(() => {
    const all = playersData?.docs ?? []
    const q = normalizeForSearch(playerQuery)
    if (!q) return all.slice(0, 30)
    return all.filter((p) => normalizeForSearch(p.name).includes(q) || normalizeForSearch(p.nameEn).includes(q)).slice(0, 30)
  }, [playersData, playerQuery])

  return (
    <Sheet visible={visible} onClose={onClose}>
      <ScrollView style={{ maxHeight: 480 }}>
        <Txt weight="bold" size="lg" style={{ marginBottom: space.md }}>
          詳細フィルタ
        </Txt>

        <FilterSection title="大会">
          <ChipRow>
            {tournaments.map((t) => (
              <Chip
                key={t.id}
                label={t.name}
                active={filters.tournament === String(t.id)}
                onPress={() =>
                  onChange({
                    ...filters,
                    tournament: filters.tournament === String(t.id) ? undefined : String(t.id),
                    round: undefined,
                  })
                }
              />
            ))}
          </ChipRow>
        </FilterSection>

        {filters.tournament ? (
          <FilterSection title="ラウンド">
            <ChipRow>
              {rounds.map((r) => (
                <Chip
                  key={r.id}
                  label={`R${r.number}`}
                  active={filters.round === String(r.id)}
                  onPress={() => onChange({ ...filters, round: filters.round === String(r.id) ? undefined : String(r.id) })}
                />
              ))}
            </ChipRow>
          </FilterSection>
        ) : null}

        <FilterSection title="選手">
          <TextField
            placeholder="選手名で検索"
            value={playerQuery}
            onChangeText={setPlayerQuery}
            containerStyle={{ marginBottom: space.sm }}
          />
          <ChipRow>
            {players.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                active={filters.player === String(p.id)}
                onPress={() => onChange({ ...filters, player: filters.player === String(p.id) ? undefined : String(p.id) })}
              />
            ))}
          </ChipRow>
        </FilterSection>

        <FilterSection title="ホール">
          <ChipRow>
            {HOLES.map((h) => (
              <Chip
                key={h}
                label={`${h}H`}
                active={filters.hole === h}
                onPress={() => onChange({ ...filters, hole: filters.hole === h ? undefined : h })}
              />
            ))}
          </ChipRow>
        </FilterSection>

        <FilterSection title="ショット種別">
          <ChipRow>
            {SHOT_TYPE_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                active={filters.shotType === o.value}
                onPress={() => onChange({ ...filters, shotType: filters.shotType === o.value ? undefined : o.value })}
              />
            ))}
          </ChipRow>
        </FilterSection>

        <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.lg }}>
          <Button
            title="条件をクリア"
            variant="ghost"
            style={{ flex: 1 }}
            onPress={() => onChange({ sort: filters.sort })}
          />
          <Button title="閉じる" style={{ flex: 1 }} onPress={onClose} />
        </View>
      </ScrollView>
    </Sheet>
  )
}

const FilterSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ marginBottom: space.lg }}>
    <Txt size="sm" weight="bold" color={colors.textSub} style={{ marginBottom: space.xs }}>
      {title}
    </Txt>
    {children}
  </View>
)

const ChipRow = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>{children}</View>
)

const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Txt size="xs" weight="bold" color={active ? colors.textInverse : colors.textSub}>
      {label}
    </Txt>
  </Pressable>
)

const styles = StyleSheet.create({
  wrap: { gap: space.sm, paddingTop: space.sm, paddingBottom: space.xs },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
  },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSubtle,
  },
  chipActive: { backgroundColor: colors.primary },
})
