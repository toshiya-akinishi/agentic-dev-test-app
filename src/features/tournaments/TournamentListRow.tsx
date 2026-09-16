/** 大会一覧の行（1-3 / 補-1-3-2, 補-5-1-1） */
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Badge, Card, StatusBadge, Txt } from '../../components/ui'
import { relDoc } from '../common'
import { formatDateRange, formatMoneyShort } from '../../lib/format'
import { colors, space } from '../../theme'
import type { Tournament, Venue } from '../../types/payload'

export const TournamentListRow = ({
  tournament,
  onSaleTicket,
  onPress,
}: {
  tournament: Tournament
  onSaleTicket?: boolean
  onPress: () => void
}) => {
  const venue = relDoc<Venue>(tournament.venue)

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.headRow}>
        <Txt weight="bold" size="md" style={{ flex: 1 }} numberOfLines={1}>
          {tournament.name}
        </Txt>
        <StatusBadge status={tournament.status} />
      </View>
      <Txt size="sm" color={colors.textSub}>
        {formatDateRange(tournament.startDate, tournament.endDate)}
        {venue ? `  ・  ${venue.name}` : ''}
      </Txt>
      <View style={styles.footRow}>
        <Txt size="sm" weight="medium" color={colors.textSub}>
          賞金総額 {formatMoneyShort(tournament.prizeMoneyTotal)}
        </Txt>
        {onSaleTicket ? <Badge label="チケット販売中" color={colors.textInverse} bg={colors.primary} /> : null}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.xs },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
})
