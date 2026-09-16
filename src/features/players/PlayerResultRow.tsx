/**
 * 選手詳細「成績」タブの1行（T-13-2 / 補-4-7-2, 補-4-14-1, 2）。
 * 大会名・日程・ラウンド・Total(対パー)・順位・（開催中なら）Thru とカット通過確率バッジ。
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { relId } from '../common'
import { formatDateRange, formatPosition, formatThru, formatToPar, toParColor } from '../../lib/format'
import { colors, space } from '../../theme'
import { CutProbabilityBadge } from './CutProbabilityBadge'
import type { PlayerTournamentResult } from '../../queries/players'

export const PlayerResultRow = ({ result }: { result: PlayerTournamentResult }) => {
  const { tournament, round, score } = result
  const isLive = tournament.status === 'live'
  const playerId = relId(score.player)

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Txt weight="medium" numberOfLines={1} style={{ flex: 1 }}>
            {tournament.name}
          </Txt>
          {isLive ? (
            <Txt size="xs" weight="bold" color={colors.live}>
              開催中
            </Txt>
          ) : null}
        </View>
        <Txt size="xs" color={colors.textMuted}>
          {formatDateRange(tournament.startDate, tournament.endDate)} ・ R{round.number}
        </Txt>
        {isLive && typeof playerId === 'number' ? (
          <CutProbabilityBadge tournamentId={tournament.id} playerId={playerId} round={round.number} />
        ) : null}
      </View>
      <View style={styles.scoreCol}>
        <Txt weight="bold" color={toParColor(score.toPar)}>
          {formatToPar(score.toPar)}
        </Txt>
        <Txt size="xs" color={colors.textSub}>
          {formatPosition(score.position, score.positionTied, score.status)}
        </Txt>
        {isLive ? (
          <Txt size="xs" color={colors.textMuted}>
            Thru {formatThru(score.thru, score.status)}
          </Txt>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  scoreCol: { alignItems: 'flex-end', minWidth: 64 },
})
