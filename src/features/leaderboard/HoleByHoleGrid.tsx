/**
 * Hole-by-Hole 展開（3-2 / 補-3-2-1, 補-3-2-2）。
 * イーグル以上=赤丸二重 / バーディ=赤丸 / パー=無印 / ボギー=青四角 / ダボ以上=青四角二重。
 * OUT / IN の小計と 18H 合計を表示する。動画のあるホールセルはタップ可能にする（補-3-8-1a, 補-3-8-2）。
 */
import React from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { formatToPar, holeResultOf, type HoleResult } from '../../lib/format'
import { sumHoles } from '../../queries/leaderboard'
import { colors, space } from '../../theme'
import type { Score, Shot } from '../../types/payload'

const CELL = 34

const HoleShape = ({ result, children }: { result: HoleResult; children: React.ReactNode }) => {
  if (result === 'par') return <View style={styles.cellPlain}>{children}</View>

  const isCircle = result === 'eagle' || result === 'birdie'
  const isDouble = result === 'eagle' || result === 'double_or_worse'
  const color = isCircle ? colors.under : colors.over
  const shape = isCircle ? styles.circle : styles.square

  const core = (
    <View style={[shape, { borderColor: color }]}>
      {children}
    </View>
  )
  if (!isDouble) return core
  return <View style={[shape, { borderColor: color, padding: 1 }]}>{core}</View>
}

const HoleCell = ({
  hole,
  hasVideo,
  onPress,
}: {
  hole: NonNullable<Score['holeScores']>[number]
  hasVideo: boolean
  onPress?: () => void
}) => {
  const result = holeResultOf(hole.strokes, hole.par)
  const content = (
    <View style={styles.cellWrap}>
      <Txt size="xs" color={colors.textMuted}>
        {hole.hole}
      </Txt>
      <HoleShape result={result}>
        <Txt size="sm" weight="bold">
          {hole.strokes}
        </Txt>
      </HoleShape>
      {hasVideo ? <View style={styles.videoDot} /> : null}
    </View>
  )
  if (!hasVideo) return content
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${hole.hole}番の動画を見る`}>
      {content}
    </Pressable>
  )
}

const HoleRow = ({
  holes,
  from,
  to,
  videoShotByHole,
  onPressHole,
}: {
  holes: NonNullable<Score['holeScores']>
  from: number
  to: number
  videoShotByHole?: Map<number, Shot>
  onPressHole?: (hole: number, shot?: Shot) => void
}) => {
  const cells = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const totals = sumHoles(holes, from, to)
  const byHole = new Map(holes.map((h) => [h.hole, h]))

  return (
    <View style={styles.row}>
      {cells.map((n) => {
        const h = byHole.get(n)
        const shot = videoShotByHole?.get(n)
        if (!h) {
          return (
            <View key={n} style={styles.cellWrap}>
              <Txt size="xs" color={colors.textMuted}>
                {n}
              </Txt>
              <View style={styles.cellPlain}>
                <Txt size="sm" color={colors.textMuted}>
                  -
                </Txt>
              </View>
            </View>
          )
        }
        return (
          <HoleCell
            key={n}
            hole={h}
            hasVideo={Boolean(shot)}
            onPress={() => onPressHole?.(n, shot)}
          />
        )
      })}
      <View style={styles.subtotalWrap}>
        <Txt size="xs" color={colors.textMuted}>
          {from === 1 ? 'OUT' : 'IN'}
        </Txt>
        <Txt weight="bold">{totals.count ? totals.strokes : '-'}</Txt>
      </View>
    </View>
  )
}

export const HoleByHoleGrid = ({
  score,
  videoShotByHole,
  onPressHole,
}: {
  score: Score
  videoShotByHole?: Map<number, Shot>
  onPressHole?: (hole: number, shot?: Shot) => void
}) => {
  const holes = score.holeScores ?? []
  if (!holes.length) {
    return (
      <Txt size="sm" color={colors.textMuted} style={{ padding: space.md }}>
        このラウンドのホール別スコアはまだありません。
      </Txt>
    )
  }
  const total = sumHoles(holes, 1, 18)

  return (
    <View style={{ gap: space.sm }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ gap: space.sm }}>
          <HoleRow holes={holes} from={1} to={9} videoShotByHole={videoShotByHole} onPressHole={onPressHole} />
          <HoleRow holes={holes} from={10} to={18} videoShotByHole={videoShotByHole} onPressHole={onPressHole} />
        </View>
      </ScrollView>
      <View style={styles.totalRow}>
        <Txt size="sm" color={colors.textSub}>
          18H合計
        </Txt>
        <Txt weight="bold" size="lg">
          {total.count ? total.strokes : '-'}
        </Txt>
        <Txt weight="bold" size="md" color={colors.textSub}>
          ({formatToPar(total.count ? total.toPar : undefined)})
        </Txt>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  cellWrap: { width: CELL, alignItems: 'center', gap: 2 },
  cellPlain: {
    width: CELL - 6,
    height: CELL - 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CELL - 6,
    height: CELL - 6,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  square: {
    width: CELL - 6,
    height: CELL - 6,
    borderRadius: 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  subtotalWrap: { width: CELL + 12, alignItems: 'center', gap: 2, marginLeft: space.xs },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.sm,
    justifyContent: 'flex-end',
    paddingRight: space.md,
  },
})
