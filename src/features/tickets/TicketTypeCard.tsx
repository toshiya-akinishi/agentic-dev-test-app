/** 券種選択カード（5-1 / 補-5-1-3） */
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Badge, Card, Txt } from '../../components/ui'
import { formatMoney } from '../../lib/format'
import { ticketTypeUnavailableReason } from '../../lib/tickets'
import { colors, space } from '../../theme'
import type { TicketType } from '../../types/payload'

export const TicketTypeCard = ({
  ticketType,
  selected,
  onPress,
}: {
  ticketType: TicketType
  selected: boolean
  onPress: () => void
}) => {
  const unavailableReason = ticketTypeUnavailableReason(ticketType)

  return (
    <Card
      onPress={unavailableReason ? undefined : onPress}
      style={[
        styles.card,
        selected && styles.cardSelected,
        Boolean(unavailableReason) && styles.cardDisabled,
      ]}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Txt weight="bold">{ticketType.name}</Txt>
          <Txt size="lg" weight="bold" color={colors.primary} style={{ marginTop: space.xs }}>
            {formatMoney(ticketType.price)}
          </Txt>
        </View>
        {unavailableReason ? (
          <Badge label={unavailableReason} color={colors.textInverse} bg={colors.textMuted} />
        ) : selected ? (
          <Txt color={colors.primary} weight="bold">
            ✓ 選択中
          </Txt>
        ) : null}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, borderColor: colors.border },
  cardSelected: { borderColor: colors.primary },
  cardDisabled: { opacity: 0.55 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
})
