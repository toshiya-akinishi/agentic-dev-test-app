/**
 * 選手比較 (b) スタッツのレーダーチャート（3-7 / 補-3-7-1）。
 * react-native-svg で手組み（軽量チャートライブラリの追加なし）。
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg'

import { Txt } from '../../components/ui'
import { colors, playerColorAt, space } from '../../theme'
import type { Player } from '../../types/payload'
import type { Stats6 } from '../../queries/leaderboard'

const SIZE = 260
const CENTER = SIZE / 2
const MAX_R = SIZE / 2 - 36

type Axis = { key: keyof Stats6; label: string; domain: [number, number]; invert?: boolean }

/** 各指標の想定レンジ（レーダーの見た目を安定させるため固定スケールで正規化する） */
export const RADAR_AXES: Axis[] = [
  { key: 'drivingDistance', label: '飛距離', domain: [220, 320] },
  { key: 'fairwayHitRate', label: 'FWキープ', domain: [0, 100] },
  { key: 'greenInRegulation', label: 'パーオン', domain: [0, 100] },
  { key: 'puttsPerRound', label: 'パット', domain: [26, 34], invert: true },
  { key: 'sandSaveRate', label: 'サンドセーブ', domain: [0, 100] },
  { key: 'scrambleRate', label: 'スクランブル', domain: [0, 100] },
]

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export const normalizeAxis = (value: number | null | undefined, axis: Axis): number => {
  if (value === null || value === undefined) return 0
  const [lo, hi] = axis.domain
  const t = clamp01((value - lo) / (hi - lo))
  return axis.invert ? 1 - t : t
}

const pointAt = (angleIndex: number, radiusRatio: number) => {
  const angle = angleIndex * ((2 * Math.PI) / RADAR_AXES.length) - Math.PI / 2
  return {
    x: CENTER + Math.cos(angle) * MAX_R * radiusRatio,
    y: CENTER + Math.sin(angle) * MAX_R * radiusRatio,
  }
}

export const CompareRadarChart = ({
  players,
}: {
  players: Array<{ player: Player; stats?: Stats6 }>
}) => {
  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <View style={{ gap: space.sm }}>
      <Svg width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {rings.map((r) => (
          <Polygon
            key={r}
            points={RADAR_AXES.map((_, i) => {
              const p = pointAt(i, r)
              return `${p.x},${p.y}`
            }).join(' ')}
            fill="none"
            stroke={colors.border}
            strokeWidth={1}
          />
        ))}
        {RADAR_AXES.map((axis, i) => {
          const p = pointAt(i, 1)
          const labelPos = pointAt(i, 1.18)
          return (
            <React.Fragment key={axis.key}>
              <Line x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke={colors.border} strokeWidth={1} />
              <SvgText
                x={labelPos.x}
                y={labelPos.y}
                fontSize={9}
                fill={colors.textSub}
                textAnchor="middle"
              >
                {axis.label}
              </SvgText>
            </React.Fragment>
          )
        })}

        {players.map((p, i) => {
          const pts = RADAR_AXES.map((axis, ai) => {
            const ratio = normalizeAxis(p.stats?.[axis.key], axis)
            const pt = pointAt(ai, ratio)
            return { pt, ratio, ai }
          })
          return (
            <React.Fragment key={p.player.id}>
              <Polygon
                points={pts.map((x) => `${x.pt.x},${x.pt.y}`).join(' ')}
                fill={playerColorAt(i)}
                fillOpacity={0.15}
                stroke={playerColorAt(i)}
                strokeWidth={2}
              />
              {pts.map((x) => (
                <Circle key={x.ai} cx={x.pt.x} cy={x.pt.y} r={2.5} fill={playerColorAt(i)} />
              ))}
            </React.Fragment>
          )
        })}
      </Svg>

      <View style={styles.legend}>
        {players.map((p, i) => (
          <View key={p.player.id} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: playerColorAt(i) }]} />
            <Txt size="xs">{p.player.name}</Txt>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 999 },
})
