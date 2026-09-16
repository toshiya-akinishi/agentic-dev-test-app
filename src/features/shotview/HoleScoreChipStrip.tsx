/**
 * ホール別スコアチップ横スクロール（T-11-8 / 補-1-46-1）。
 * 表示中選手（先頭1名）の 1H〜18H を横スクロールで並べ、タップでホール切替する。
 * 色分け・形は `HoleByHoleGrid`（EP-10）の慣例（イーグル以上=赤丸二重 / バーディ=赤丸 /
 * パー=無印 / ボギー=青四角 / ダボ以上=青四角二重）に揃える。
 */
import React from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { holeResultOf, type HoleResult } from '../../lib/format'
import { colors, space } from '../../theme'
import type { Score } from '../../types/payload'

const CHIP = 42

const shapeStyle = (result: HoleResult | undefined) => {
  if (!result || result === 'par') return { border: colors.border, isCircle: true, double: false }
  const isCircle = result === 'eagle' || result === 'birdie'
  const isDouble = result === 'eagle' || result === 'double_or_worse'
  const color = isCircle ? colors.under : colors.over
  return { border: color, isCircle, double: isDouble }
}

export const HoleScoreChipStrip = ({
  score,
  selectedHole,
  onSelectHole,
  totalHoles = 18,
}: {
  /** 表示中選手（先頭1名）の score。未選択時は undefined でホール番号だけ出す */
  score: Score | undefined
  selectedHole: number
  onSelectHole: (hole: number) => void
  totalHoles?: number
}) => {
  const byHole = new Map((score?.holeScores ?? []).map((h) => [h.hole, h]))

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {Array.from({ length: totalHoles }, (_, i) => i + 1).map((n) => {
        const h = byHole.get(n)
        const result = h ? holeResultOf(h.strokes, h.par) : undefined
        const shape = shapeStyle(result)
        const selected = n === selectedHole
        return (
          <Pressable key={n} onPress={() => onSelectHole(n)} style={styles.chipWrap}>
            <Txt size="xs" color={selected ? colors.primary : colors.textMuted} weight={selected ? 'bold' : 'regular'}>
              {n}H
            </Txt>
            <View
              style={[
                shape.isCircle ? styles.circle : styles.square,
                { borderColor: shape.border, borderWidth: shape.double ? 2.5 : 1.5 },
                selected && styles.selected,
              ]}
            >
              <Txt size="xs" weight="bold" color={h ? colors.text : colors.textMuted}>
                {h ? h.strokes : '-'}
              </Txt>
            </View>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs, paddingHorizontal: space.lg, paddingVertical: space.sm },
  chipWrap: { alignItems: 'center', gap: 2, width: CHIP },
  circle: {
    width: CHIP - 10,
    height: CHIP - 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  square: {
    width: CHIP - 10,
    height: CHIP - 10,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.bgSubtle },
})
