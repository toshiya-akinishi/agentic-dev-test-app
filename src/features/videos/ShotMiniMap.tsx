/**
 * ミニマップ（T-12-2 / 補-2-9-2）。
 * EP-11 ショットビュー（1-42）の本格的な 2D 弾道表示とは別物の、動画詳細用の簡易プレビュー。
 * ホールの `bounds` が取れる場合はホール俯瞰の枠内に打点→停止点を実座標で描画し、
 * 取れない場合は方位・距離だけからおおよその位置関係を示す簡易表現にフォールバックする。
 * 緯度経度の生値は初期状態では畳んでおき、タップで展開する（補-2-9-2）。
 */
import React, { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Svg, { Circle, Line, Rect } from 'react-native-svg'

import { Txt } from '../../components/ui'
import {
  haversineMeters,
  hasBounds,
  hasLatLng,
  metersToYards,
  projectInBounds,
  projectStandalone,
  type Bounds,
} from '../../lib/geo'
import { useVideoHole } from '../../queries/videos'
import { colors, radius, space } from '../../theme'
import type { Video } from '../../types/payload'

export const ShotMiniMap = ({ video }: { video: Video }) => {
  const [expanded, setExpanded] = useState(false)
  const { hole, isLoading } = useVideoHole(video)

  const start = video.startLocation
  const end = video.endLocation
  if (!hasLatLng(start) || !hasLatLng(end)) return null

  const bounds = hole?.bounds
  const usingRealBounds = hasBounds(bounds)
  const points: { start: { x: number; y: number }; end: { x: number; y: number } } = usingRealBounds
    ? { start: projectInBounds(bounds as Bounds, start), end: projectInBounds(bounds as Bounds, end) }
    : projectStandalone(start, end)

  const distanceM = haversineMeters(start, end)
  const distanceYards = Math.round(metersToYards(distanceM))

  const SIZE = 100
  const toPx = (v: number) => v * SIZE

  return (
    <View style={styles.wrap}>
      <Txt size="sm" weight="bold" color={colors.textSub} style={{ marginBottom: space.xs }}>
        打点 → 停止点 {isLoading ? '' : usingRealBounds ? '' : '（簡易表示）'}
      </Txt>
      <View style={styles.mapBox}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Rect x={2} y={2} width={SIZE - 4} height={SIZE - 4} rx={6} fill={colors.bgSubtle} stroke={colors.border} />
          <Line
            x1={toPx(points.start.x)}
            y1={toPx(points.start.y)}
            x2={toPx(points.end.x)}
            y2={toPx(points.end.y)}
            stroke={colors.primary}
            strokeWidth={2}
            strokeDasharray="4,3"
          />
          <Circle cx={toPx(points.start.x)} cy={toPx(points.start.y)} r={4} fill={colors.accent} />
          <Circle cx={toPx(points.end.x)} cy={toPx(points.end.y)} r={4} fill={colors.primary} />
        </Svg>
      </View>
      <View style={styles.legendRow}>
        <Legend color={colors.accent} label="打点" />
        <Legend color={colors.primary} label="停止点" />
        <Txt size="xs" color={colors.textMuted}>
          推定飛距離 約{distanceYards}Y
        </Txt>
      </View>

      <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8}>
        <Txt size="xs" color={colors.primary} style={{ marginTop: space.xs }}>
          {expanded ? '緯度経度を隠す ▲' : '緯度経度を表示 ▼'}
        </Txt>
      </Pressable>
      {expanded ? (
        <View style={styles.coordsBox}>
          <Txt size="xs" color={colors.textSub}>
            打点: {start.lat!.toFixed(6)}, {start.lng!.toFixed(6)}
          </Txt>
          <Txt size="xs" color={colors.textSub}>
            停止点: {end.lat!.toFixed(6)}, {end.lng!.toFixed(6)}
          </Txt>
        </View>
      ) : null}
    </View>
  )
}

const Legend = ({ color, label }: { color: string; label: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    <Txt size="xs" color={colors.textMuted}>
      {label}
    </Txt>
  </View>
)

const styles = StyleSheet.create({
  wrap: { marginTop: space.md },
  mapBox: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 260,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  legendRow: { flexDirection: 'row', gap: space.md, marginTop: space.xs, alignItems: 'center' },
  coordsBox: { marginTop: space.xs, gap: 2 },
})
