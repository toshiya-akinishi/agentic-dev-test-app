/**
 * 過去データ分析パネル（T-11-11 / 1-41 / 補-1-41-1・SIMPL）。
 * 3 指標に限定: 同一ホールの過去平均スコア・バーディ率・当該選手の過去成績（当該大会内）。
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { formatToPar } from '../../lib/format'
import { colors, space } from '../../theme'
import type { HoleAggregate, PlayerHoleHistoryRow } from '../../queries/shots'

export const HoleAnalysisPanel = ({
  hole,
  par,
  aggregate,
  playerName,
  playerHistory,
  roundNumberById,
}: {
  hole: number
  par: number | undefined
  aggregate: HoleAggregate
  playerName: string | undefined
  playerHistory: PlayerHoleHistoryRow[]
  roundNumberById: Map<number, number>
}) => {
  return (
    <View style={styles.wrap}>
      <Txt size="sm" weight="bold" color={colors.textSub}>
        {hole}H{par ? `（Par ${par}）` : ''} の過去データ
      </Txt>
      <View style={styles.row}>
        <Stat label="平均スコア" value={aggregate.avgStrokes !== undefined ? aggregate.avgStrokes.toFixed(2) : '-'} />
        <Stat label="バーディ率" value={aggregate.birdieRate !== undefined ? `${aggregate.birdieRate.toFixed(0)}%` : '-'} />
        <Stat label="サンプル数" value={`${aggregate.sampleSize}`} />
      </View>

      {playerName ? (
        <View style={{ marginTop: space.sm }}>
          <Txt size="xs" color={colors.textSub}>
            {playerName} のこの大会での {hole}H 成績
          </Txt>
          {playerHistory.length === 0 ? (
            <Txt size="sm" color={colors.textMuted} style={{ marginTop: 2 }}>
              このホールのデータはまだありません。
            </Txt>
          ) : (
            <View style={styles.historyRow}>
              {playerHistory.map((h) => (
                <View key={h.roundId} style={styles.historyChip}>
                  <Txt size="xs" color={colors.textMuted}>
                    R{roundNumberById.get(h.roundId) ?? '?'}
                  </Txt>
                  <Txt size="sm" weight="bold">
                    {h.strokes}（{formatToPar(h.toPar)}）
                  </Txt>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}
    </View>
  )
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.stat}>
    <Txt size="xs" color={colors.textSub}>
      {label}
    </Txt>
    <Txt weight="bold" size="lg">
      {value}
    </Txt>
  </View>
)

const styles = StyleSheet.create({
  wrap: { padding: space.md, backgroundColor: colors.bgSubtle, borderRadius: 10, gap: space.xs },
  row: { flexDirection: 'row', gap: space.lg, marginTop: space.xs },
  stat: { gap: 2 },
  historyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  historyChip: {
    backgroundColor: colors.bgElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    alignItems: 'center',
  },
})
