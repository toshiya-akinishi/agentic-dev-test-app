/**
 * ゾーンタップ時の詳細表示（T-11-12 / 補-1-47-2）。
 * Birdie% / Par% / Bogey% / 平均ストローク / サンプル数。サンプル数 30 未満は「参考値」と注記する。
 */
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { colors, radius, space } from '../../theme'
import type { HoleStatistic } from '../../types/payload'
import { LOW_SAMPLE_THRESHOLD } from '../../queries/shots'
import { ZONE_LABELS } from './zones'

const pct = (v: number | null | undefined): string => (v === null || v === undefined ? '-' : `${v.toFixed(0)}%`)

export const ZoneDetailCard = ({ stat, zone, onClose }: { stat: HoleStatistic | undefined; zone: HoleStatistic['zone']; onClose: () => void }) => {
  const isLowSample = (stat?.sampleSize ?? 0) < LOW_SAMPLE_THRESHOLD

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Txt weight="bold">{ZONE_LABELS[zone]}</Txt>
        <Pressable onPress={onClose} hitSlop={8}>
          <Txt color={colors.textMuted}>閉じる ×</Txt>
        </Pressable>
      </View>
      {!stat ? (
        <Txt size="sm" color={colors.textMuted} style={{ marginTop: space.xs }}>
          このゾーンの集計データはまだありません。
        </Txt>
      ) : (
        <>
          <View style={styles.row}>
            <Metric label="Birdie%" value={pct(stat.birdieRate)} />
            <Metric label="Par%" value={pct(stat.parRate)} />
            <Metric label="Bogey%" value={pct(stat.bogeyRate)} />
          </View>
          <View style={styles.row}>
            <Metric label="平均ストローク" value={stat.avgStrokes !== null && stat.avgStrokes !== undefined ? stat.avgStrokes.toFixed(2) : '-'} />
            <Metric label="サンプル数" value={`${stat.sampleSize ?? 0}`} />
          </View>
          {isLowSample ? (
            <Txt size="xs" color={colors.warning} style={{ marginTop: space.xs }}>
              サンプル数が少ないため参考値です
            </Txt>
          ) : null}
        </>
      )}
    </View>
  )
}

const Metric = ({ label, value }: { label: string; value: string }) => (
  <View style={{ gap: 2 }}>
    <Txt size="xs" color={colors.textSub}>
      {label}
    </Txt>
    <Txt weight="bold">{value}</Txt>
  </View>
)

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space.lg,
    marginTop: space.sm,
    padding: space.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: space.lg, marginTop: space.sm },
})
