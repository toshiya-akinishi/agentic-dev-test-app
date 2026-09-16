/**
 * カット通過確率バッジ（T-13-2 / 補-4-14-1, 2）。
 * T-13-7 で cms 側に実装済みの `GET /api/players/cut-probability` を利用する。
 * 呼び出し側で「対象大会が live かどうか」を判定してからマウントする想定
 * （成績タブの `PlayerResultRow` を参照）。
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { useCutProbability } from '../../queries/players'
import { colors, radius, space } from '../../theme'

const TIER_COLOR: Record<string, string> = {
  絶望的: colors.danger,
  厳しい: colors.warning,
  微妙: colors.textSub,
  やや有力: colors.info,
  有力: colors.success,
}

export const CutProbabilityBadge = ({
  tournamentId,
  playerId,
  round,
}: {
  tournamentId: number
  playerId: number
  round?: number
}) => {
  const { data, isLoading, error } = useCutProbability(tournamentId, playerId, round)
  const row = data?.players?.[0]
  if (isLoading || error || !row) return null

  return (
    <View style={[styles.badge, { backgroundColor: TIER_COLOR[row.tierLabel] ?? colors.bgSubtle }]}>
      <Txt size="xs" weight="bold" color={colors.textInverse}>
        カット通過確率 {row.cutProbability}%（{row.tierLabel}）
      </Txt>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginTop: space.xs,
  },
})
