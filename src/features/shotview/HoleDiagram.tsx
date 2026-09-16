/**
 * ショットビュー中央のホール 2D 図（T-11-1, T-11-2, T-11-3, T-11-5, T-11-12）。
 * 補-1-42-1: 緯度経度→SVG 座標は `src/lib/geo.ts` の bounds 線形変換を再利用する
 * （EP-12 の `ShotMiniMap` と同じ変換だが、こちらは複数選手・複数打の本格版）。
 * 補-1-44-1: ピンチズーム / ドラッグパン / 向き反転（ティー基準⇄グリーン基準）の 3 操作。
 */
import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Circle, Line, Path, Polygon, Text as SvgText } from 'react-native-svg'

import { Txt } from '../../components/ui'
import {
  hasBounds,
  hasLatLng,
  metersToYards,
  haversineMeters,
  projectInBounds,
  projectStandalone,
  type Bounds,
} from '../../lib/geo'
import { colors, radius, space } from '../../theme'
import type { ShotviewOrientation } from '../../store/ui'
import type { Hole, HoleStatistic, Player, Shot } from '../../types/payload'
import { HAZARD_STYLE, projectHazards } from './hazards'
import { trajectoryPathD } from './trajectory'
import { buildZoneShapes, heatColor, type Pt, type Zone, type ZoneShape } from './zones'

const SIZE = 320
const MIN_SCALE = 1
const MAX_SCALE = 4

export type PlayerShots = { player: Player; color: string; shots: Shot[] }

type ShotPoint = { shot: Shot; player: Player; color: string; start: Pt; end: Pt; index: number }

const FALLBACK_TEE: Pt = { x: 0.5, y: 0.86 }
const FALLBACK_GREEN: Pt = { x: 0.5, y: 0.16 }

const pointInPolygon = (p: Pt, poly: Pt[]): boolean => {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y
    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

const pointInZone = (p: Pt, shape: ZoneShape): boolean => {
  if (shape.kind === 'circle' && shape.center && shape.radius !== undefined) {
    return Math.hypot(p.x - shape.center.x, p.y - shape.center.y) <= shape.radius
  }
  if (shape.kind === 'polygon' && shape.points) return pointInPolygon(p, shape.points)
  return false
}

export const HoleDiagram = ({
  hole,
  playersShots,
  orientation,
  heatmapOn,
  byZone,
  onShotPress,
  onZonePress,
}: {
  hole: Hole | undefined
  playersShots: PlayerShots[]
  orientation: ShotviewOrientation
  heatmapOn: boolean
  byZone: Map<Zone, HoleStatistic>
  onShotPress: (shot: Shot, player: Player, color: string) => void
  onZonePress: (zone: Zone) => void
}) => {
  const usingRealBounds = hasBounds(hole?.bounds)
  const bounds = usingRealBounds ? (hole!.bounds as Bounds) : undefined

  const teePt = useMemo<Pt>(() => {
    if (bounds && hasLatLng(hole?.teeLocation)) return projectInBounds(bounds, hole!.teeLocation as { lat: number; lng: number })
    return FALLBACK_TEE
  }, [bounds, hole])
  const greenPt = useMemo<Pt>(() => {
    if (bounds && hasLatLng(hole?.greenLocation)) return projectInBounds(bounds, hole!.greenLocation as { lat: number; lng: number })
    return FALLBACK_GREEN
  }, [bounds, hole])

  const hazards = useMemo(() => projectHazards(hole), [hole])
  const zoneShapes = useMemo(() => buildZoneShapes(teePt, greenPt), [teePt, greenPt])

  const shotPoints = useMemo<ShotPoint[]>(() => {
    const out: ShotPoint[] = []
    playersShots.forEach((ps, playerIndex) => {
      ps.shots.forEach((shot, shotIndex) => {
        let pts: { start: Pt; end: Pt } | undefined
        if (bounds) {
          pts = { start: projectInBounds(bounds, shot.startLocation), end: projectInBounds(bounds, shot.endLocation) }
        } else if (hasLatLng(shot.startLocation) && hasLatLng(shot.endLocation)) {
          pts = projectStandalone(shot.startLocation, shot.endLocation)
        }
        if (!pts) return
        out.push({ shot, player: ps.player, color: ps.color, start: pts.start, end: pts.end, index: playerIndex * 100 + shotIndex })
      })
    })
    return out
  }, [playersShots, bounds])

  /* ---------------- ジェスチャー（補-1-44-1） ---------------- */
  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const savedTranslateX = useSharedValue(0)
  const savedTranslateY = useSharedValue(0)
  const flip = useSharedValue(orientation === 'green' ? 1 : 0)

  useEffect(() => {
    flip.value = withTiming(orientation === 'green' ? 1 : 0, { duration: 220 })
  }, [orientation, flip])

  useEffect(() => {
    // ホール切替時はズーム/パンをリセットする
    scale.value = withTiming(1, { duration: 150 })
    translateX.value = withTiming(0, { duration: 150 })
    translateY.value = withTiming(0, { duration: 150 })
    savedScale.value = 1
    savedTranslateX.value = 0
    savedTranslateY.value = 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hole?.id])

  const [selectedZone, setSelectedZone] = useState<Zone | undefined>(undefined)

  const handleTap = (x: number, y: number) => {
    const nx = x / SIZE
    const ny = y / SIZE
    let nearest: ShotPoint | undefined
    let nearestDist = 0.035 // タップ許容半径（正規化座標）
    for (const sp of shotPoints) {
      const d = Math.hypot(sp.end.x - nx, sp.end.y - ny)
      if (d <= nearestDist) {
        nearestDist = d
        nearest = sp
      }
    }
    if (nearest) {
      onShotPress(nearest.shot, nearest.player, nearest.color)
      return
    }
    if (heatmapOn) {
      const hit = zoneShapes.find((z) => pointInZone({ x: nx, y: ny }, z))
      if (hit) {
        setSelectedZone(hit.zone)
        onZonePress(hit.zone)
      }
    }
  }

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * e.scale))
    })
    .onEnd(() => {
      savedScale.value = scale.value
    })

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX
      translateY.value = savedTranslateY.value + e.translationY
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value
      savedTranslateY.value = translateY.value
    })

  const tapGesture = Gesture.Tap()
    .maxDistance(6)
    .onEnd((e) => {
      runOnJS(handleTap)(e.x, e.y)
    })

  const composedGesture = Gesture.Race(Gesture.Simultaneous(panGesture, pinchGesture), tapGesture)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotateZ: `${flip.value * 180}deg` },
    ],
  }))

  const distanceYardsOf = (shot: Shot): number =>
    shot.distanceYards ?? Math.round(metersToYards(haversineMeters(shot.startLocation, shot.endLocation)))

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.box, animatedStyle]}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {/* フェアウェイ帯の概形（補-1-42-1: ティー→グリーン軸に沿った SIMPL の帯状近似） */}
            <Line
              x1={teePt.x * SIZE}
              y1={teePt.y * SIZE}
              x2={greenPt.x * SIZE}
              y2={greenPt.y * SIZE}
              stroke="#CFE3C9"
              strokeWidth={SIZE * 0.24}
              strokeLinecap="round"
              opacity={heatmapOn ? 0.15 : 0.6}
            />

            {/* ハザード（補-1-42-1） */}
            {hazards.map((h) => (
              <Polygon
                key={h.id}
                points={h.points.map((p) => `${p.x * SIZE},${p.y * SIZE}`).join(' ')}
                fill={HAZARD_STYLE[h.type].fill}
                stroke={HAZARD_STYLE[h.type].stroke}
                strokeWidth={1.5}
                strokeDasharray={h.type === 'ob' ? '4,3' : undefined}
              />
            ))}

            {/* ヒートマップ（補-1-47-1）: トグル ON 時のみゾーンを色分け表示 */}
            {heatmapOn &&
              zoneShapes.map((z) => {
                const stat = byZone.get(z.zone)
                const color = heatColor(stat?.birdieRate)
                const selected = selectedZone === z.zone
                if (z.kind === 'circle' && z.center && z.radius !== undefined) {
                  return (
                    <Circle
                      key={z.zone}
                      cx={z.center.x * SIZE}
                      cy={z.center.y * SIZE}
                      r={z.radius * SIZE}
                      fill={color}
                      opacity={0.55}
                      stroke={selected ? colors.text : 'transparent'}
                      strokeWidth={selected ? 2 : 0}
                    />
                  )
                }
                return (
                  <Polygon
                    key={z.zone}
                    points={(z.points ?? []).map((p) => `${p.x * SIZE},${p.y * SIZE}`).join(' ')}
                    fill={color}
                    opacity={0.55}
                    stroke={selected ? colors.text : 'transparent'}
                    strokeWidth={selected ? 2 : 0}
                  />
                )
              })}

            {/* ティー / グリーン（1-42） */}
            <Circle cx={teePt.x * SIZE} cy={teePt.y * SIZE} r={5} fill={colors.textSub} />
            <Circle cx={greenPt.x * SIZE} cy={greenPt.y * SIZE} r={SIZE * 0.055} fill="#8FCB8C" stroke="#5FA25C" strokeWidth={1.5} />

            {/* 弾道（T-11-2 / 補-1-42-2） */}
            {shotPoints.map((sp) => (
              <Path
                key={`path-${sp.shot.id}`}
                d={trajectoryPathD(sp.start, sp.end, sp.shot.shotType, sp.index % 2 === 0 ? 1 : -1, SIZE)}
                stroke={sp.color}
                strokeWidth={2}
                fill="none"
                opacity={0.9}
              />
            ))}
            {shotPoints.map((sp) => (
              <Circle key={`dot-${sp.shot.id}`} cx={sp.end.x * SIZE} cy={sp.end.y * SIZE} r={5} fill={sp.color} stroke="#FFF" strokeWidth={1.5} />
            ))}
            {shotPoints.map((sp) => (
              <SvgText
                key={`label-halo-${sp.shot.id}`}
                x={sp.end.x * SIZE + 7}
                y={sp.end.y * SIZE - 6}
                fontSize={10}
                fontWeight="bold"
                fill="none"
                stroke={colors.bg}
                strokeWidth={3}
              >
                {Math.round(distanceYardsOf(sp.shot))}Y
              </SvgText>
            ))}
            {shotPoints.map((sp) => (
              <SvgText
                key={`label-${sp.shot.id}`}
                x={sp.end.x * SIZE + 7}
                y={sp.end.y * SIZE - 6}
                fontSize={10}
                fontWeight="bold"
                fill={colors.text}
              >
                {Math.round(distanceYardsOf(sp.shot))}Y
              </SvgText>
            ))}
          </Svg>
        </Animated.View>
      </GestureDetector>

      {playersShots.length === 0 ? (
        <View style={styles.overlayHint} pointerEvents="none">
          <Txt size="sm" color={colors.textMuted}>
            選手を選ぶとショットが表示されます
          </Txt>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#EAF3E7',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: { width: SIZE, height: SIZE },
  overlayHint: {
    position: 'absolute',
    bottom: space.sm,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
})
