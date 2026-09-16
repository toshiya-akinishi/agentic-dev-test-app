/**
 * 選手比較 (a) スコア推移折れ線（ホール別 累積 To Par）（3-7 / 補-3-7-1）。
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg'

import { Txt } from '../../components/ui'
import { formatToPar } from '../../lib/format'
import { colors, playerColorAt, space } from '../../theme'
import type { Player, Score } from '../../types/payload'

const W = 320
const H = 200
const PAD_L = 28
const PAD_R = 12
const PAD_T = 12
const PAD_B = 20

export type CumulativePoint = { hole: number; cum: number }

/** ホール昇順に累積 To Par を積算する（純関数・テスト容易） */
export const cumulativeToPar = (holeScores: NonNullable<Score['holeScores']>): CumulativePoint[] => {
  const sorted = [...holeScores].sort((a, b) => a.hole - b.hole)
  let running = 0
  return sorted.map((h) => {
    running += h.toPar
    return { hole: h.hole, cum: running }
  })
}

export const CompareScoreChart = ({
  players,
}: {
  players: Array<{ player: Player; score?: Score }>
}) => {
  const series = players.map((p) => ({
    player: p.player,
    points: p.score?.holeScores?.length ? cumulativeToPar(p.score.holeScores) : [],
  }))

  const allCum = series.flatMap((s) => s.points.map((p) => p.cum))
  const minY = Math.min(0, ...allCum, -1)
  const maxY = Math.max(0, ...allCum, 1)
  const xToPixel = (hole: number) => PAD_L + ((hole - 1) / 17) * (W - PAD_L - PAD_R)
  const yToPixel = (v: number) => PAD_T + (1 - (v - minY) / (maxY - minY)) * (H - PAD_T - PAD_B)

  const hasAnyData = series.some((s) => s.points.length > 0)

  return (
    <View style={{ gap: space.sm }}>
      {hasAnyData ? (
        <Svg width="100%" viewBox={`0 0 ${W} ${H}`}>
          <Line x1={PAD_L} y1={yToPixel(0)} x2={W - PAD_R} y2={yToPixel(0)} stroke={colors.border} strokeWidth={1} />
          <SvgText x={2} y={yToPixel(0) + 4} fontSize={9} fill={colors.textMuted}>
            E
          </SvgText>
          <SvgText x={2} y={PAD_T + 8} fontSize={9} fill={colors.textMuted}>
            {formatToPar(maxY)}
          </SvgText>
          <SvgText x={2} y={H - PAD_B} fontSize={9} fill={colors.textMuted}>
            {formatToPar(minY)}
          </SvgText>

          {series.map((s, i) =>
            s.points.length ? (
              <Polyline
                key={s.player.id}
                points={s.points.map((p) => `${xToPixel(p.hole)},${yToPixel(p.cum)}`).join(' ')}
                fill="none"
                stroke={playerColorAt(i)}
                strokeWidth={2}
              />
            ) : null,
          )}
          {series.map((s, i) =>
            s.points.map((p) => (
              <Circle
                key={`${s.player.id}-${p.hole}`}
                cx={xToPixel(p.hole)}
                cy={yToPixel(p.cum)}
                r={2.5}
                fill={playerColorAt(i)}
              />
            )),
          )}
        </Svg>
      ) : (
        <Txt size="sm" color={colors.textMuted} style={{ padding: space.md }}>
          このラウンドのホール別スコアはまだありません。
        </Txt>
      )}

      <View style={styles.legend}>
        {series.map((s, i) => (
          <View key={s.player.id} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: playerColorAt(i) }]} />
            <Txt size="xs">{s.player.name}</Txt>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 999 },
})
