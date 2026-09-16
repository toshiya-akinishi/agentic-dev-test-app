/** マイページ「チケット」一覧の行（5-3 / 補-5-3-1, 補-5-3-2） */
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Badge, Card, Txt } from '../../components/ui'
import { relDoc } from '../common'
import { formatDate, formatMoney } from '../../lib/format'
import { colors, space } from '../../theme'
import type { TicketOrder, TicketType, Tournament } from '../../types/payload'

const STATUS_LABEL: Record<TicketOrder['status'], string> = {
  pending: '決済待ち',
  paid: '有効',
  cancelled: 'キャンセル済み',
  used: '使用済み',
}

export const TicketOrderRow = ({ order, onPress }: { order: TicketOrder; onPress: () => void }) => {
  const ticketType = relDoc<TicketType>(order.ticketType)
  const tournament = ticketType ? relDoc<Tournament>(ticketType.tournament) : undefined

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Txt weight="bold">{tournament?.name ?? '大会'}</Txt>
          <Txt size="sm" color={colors.textSub}>
            {ticketType?.name ?? '券種'} ・ {order.quantity}枚 ・ {formatMoney(order.amount)}
          </Txt>
          {ticketType?.validDate ? (
            <Txt size="xs" color={colors.textMuted}>
              有効日 {formatDate(ticketType.validDate)}
            </Txt>
          ) : null}
        </View>
        <Badge
          label={STATUS_LABEL[order.status]}
          color={order.status === 'paid' ? colors.textInverse : colors.textSub}
          bg={order.status === 'paid' ? colors.success : colors.bgSubtle}
        />
      </View>
      <Txt size="xs" color={colors.textMuted} selectable>
        注文番号 {order.orderNo}
      </Txt>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
})
