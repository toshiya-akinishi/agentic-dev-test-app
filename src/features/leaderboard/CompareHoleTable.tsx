/**
 * 選手比較 (c) Hole-by-Hole の並列表（3-7 / 補-3-7-1）。
 * 行=ホール、列=選手。選手の色分け（playerColorAt）でヘッダを揃える。
 */
import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { formatToPar, holeResultOf } from '../../lib/format'
import { sumHoles } from '../../queries/leaderboard'
import { colors, playerColorAt, space } from '../../theme'
import type { Player, Score } from '../../types/payload'

const NAME_COL = 32
const PLAYER_COL = 52

export const CompareHoleTable = ({
  players,
}: {
  players: Array<{ player: Player; score?: Score }>
}) => {
  const holeNumbers = Array.from({ length: 18 }, (_, i) => i + 1)
  const byHole = players.map((p) => new Map((p.score?.holeScores ?? []).map((h) => [h.hole, h])))

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={styles.row}>
          <View style={{ width: NAME_COL }} />
          {players.map((p, i) => (
            <View key={p.player.id} style={[styles.cell, { width: PLAYER_COL }]}>
              <View style={[styles.colorDot, { backgroundColor: playerColorAt(i) }]} />
              <Txt size="xs" weight="bold" numberOfLines={1}>
                {p.player.name}
              </Txt>
            </View>
          ))}
        </View>

        {holeNumbers.map((hole) => (
          <View key={hole} style={styles.row}>
            <View style={[styles.cell, { width: NAME_COL }]}>
              <Txt size="xs" color={colors.textMuted}>
                {hole}
              </Txt>
            </View>
            {byHole.map((map, i) => {
              const h = map.get(hole)
              if (!h)
                return (
                  <View key={i} style={[styles.cell, { width: PLAYER_COL }]}>
                    <Txt size="sm" color={colors.textMuted}>
                      -
                    </Txt>
                  </View>
                )
              const result = holeResultOf(h.strokes, h.par)
              const color =
                result === 'eagle' || result === 'birdie'
                  ? colors.under
                  : result === 'bogey' || result === 'double_or_worse'
                    ? colors.over
                    : colors.text
              return (
                <View key={i} style={[styles.cell, { width: PLAYER_COL }]}>
                  <Txt size="sm" weight="bold" color={color}>
                    {h.strokes}
                  </Txt>
                </View>
              )
            })}
          </View>
        ))}

        <View style={[styles.row, styles.totalRow]}>
          <View style={[styles.cell, { width: NAME_COL }]}>
            <Txt size="xs" weight="bold">
              計
            </Txt>
          </View>
          {players.map((p, i) => {
            const total = p.score?.holeScores?.length ? sumHoles(p.score.holeScores, 1, 18) : undefined
            return (
              <View key={i} style={[styles.cell, { width: PLAYER_COL }]}>
                <Txt size="sm" weight="bold">
                  {total?.count ? `${total.strokes}(${formatToPar(total.toPar)})` : '-'}
                </Txt>
              </View>
            )
          })}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  cell: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  colorDot: { width: 8, height: 8, borderRadius: 999 },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: space.xs },
})
