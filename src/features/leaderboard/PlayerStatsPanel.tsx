/**
 * 選手別スタッツ 6 指標（3-6 / 補-3-6-1）。ラウンド別 / 大会累計を切替表示する。
 */
import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Tabs, Txt } from '../../components/ui'
import { usePlayerTournamentScores, type Stats6 } from '../../queries/leaderboard'
import { colors, space } from '../../theme'

const STAT_DEFS: Array<{ key: keyof Stats6; label: string; unit: string; digits?: number }> = [
  { key: 'drivingDistance', label: '平均飛距離', unit: 'Y' },
  { key: 'fairwayHitRate', label: 'フェアウェイキープ率', unit: '%' },
  { key: 'greenInRegulation', label: 'パーオン率', unit: '%' },
  { key: 'puttsPerRound', label: '平均パット数', unit: '', digits: 1 },
  { key: 'sandSaveRate', label: 'サンドセーブ率', unit: '%' },
  { key: 'scrambleRate', label: 'スクランブリング率', unit: '%' },
]

const formatStat = (value: number | null | undefined, unit: string, digits = 0): string =>
  value === null || value === undefined ? '-' : `${value.toFixed(digits)}${unit}`

export const StatsGrid = ({ stats }: { stats: Stats6 | undefined }) => (
  <View style={styles.grid}>
    {STAT_DEFS.map((def) => (
      <View key={def.key} style={styles.cell}>
        <Txt size="xs" color={colors.textSub}>
          {def.label}
        </Txt>
        <Txt weight="bold" size="lg">
          {formatStat(stats?.[def.key], def.unit, def.digits)}
        </Txt>
      </View>
    ))}
  </View>
)

/** ラウンド別（そのラウンドの score.stats）/ 大会累計（全ラウンド平均）の切替つきパネル */
export const PlayerStatsPanel = ({
  tournamentId,
  playerId,
  roundStats,
}: {
  tournamentId: string
  playerId: number
  /** 現在表示中ラウンドの score.stats */
  roundStats: Stats6 | undefined
}) => {
  const [mode, setMode] = useState<'round' | 'total'>('round')
  const { stats: totalStats, isLoading } = usePlayerTournamentScores(tournamentId, playerId)

  return (
    <View style={{ gap: space.sm }}>
      <Tabs
        value={mode}
        onChange={setMode}
        options={[
          { value: 'round', label: 'このラウンド' },
          { value: 'total', label: '大会累計' },
        ]}
      />
      {mode === 'round' ? (
        <StatsGrid stats={roundStats} />
      ) : isLoading ? (
        <Txt size="sm" color={colors.textMuted} style={{ padding: space.md }}>
          読み込み中…
        </Txt>
      ) : (
        <StatsGrid stats={totalStats} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: {
    width: '31%',
    backgroundColor: colors.bgSubtle,
    borderRadius: 8,
    padding: space.sm,
    gap: 2,
  },
})
