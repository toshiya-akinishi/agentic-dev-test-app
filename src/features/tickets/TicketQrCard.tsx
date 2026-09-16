/**
 * 電子チケットの券面（5-3 / 補-5-3-2）。
 * QR（`qrPayload`）+ 券種名 + 大会名 + 有効日 + 注文番号 + 枚数を表示する。
 * スクリーンショット対策・再利用防止の検証は Ph1 対象外（元表の備考どおり）。
 */
import React from 'react'
import QRCode from 'react-native-qrcode-svg'
import { StyleSheet, View } from 'react-native'

import { Badge, Card, Txt } from '../../components/ui'
import { relDoc } from '../common'
import { formatDate } from '../../lib/format'
import { isTicketOrderValid } from '../../lib/tickets'
import { colors, radius, space } from '../../theme'
import type { TicketOrder, TicketType, Tournament } from '../../types/payload'

export const TicketQrCard = ({ order }: { order: TicketOrder }) => {
  const ticketType = relDoc<TicketType>(order.ticketType)
  const tournament = ticketType ? relDoc<Tournament>(ticketType.tournament) : undefined
  const valid = isTicketOrderValid(order.status, ticketType?.validDate)

  return (
    <Card style={styles.card}>
      <Badge
        label={valid ? '有効' : order.status === 'used' ? '使用済み' : order.status === 'cancelled' ? 'キャンセル済み' : '期限切れ'}
        color={colors.textInverse}
        bg={valid ? colors.success : colors.textMuted}
      />

      {order.qrPayload ? (
        <View style={styles.qrWrap}>
          <QRCode value={order.qrPayload} size={200} />
        </View>
      ) : (
        <Txt color={colors.textMuted}>QRコードを準備できません</Txt>
      )}

      <View style={{ gap: space.xs, alignItems: 'center' }}>
        <Txt weight="bold" size="lg" style={{ textAlign: 'center' }}>
          {tournament?.name ?? '大会'}
        </Txt>
        <Txt color={colors.textSub}>{ticketType?.name ?? '券種'}</Txt>
        <Txt color={colors.textSub}>
          {ticketType?.validDate ? `有効日 ${formatDate(ticketType.validDate)}` : '有効期限なし'} ・ {order.quantity}枚
        </Txt>
        <Txt size="xs" color={colors.textMuted} selectable>
          注文番号 {order.orderNo}
        </Txt>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: space.lg, padding: space.xl },
  // QR は白背景固定でないとスキャン精度が落ちるため、ダークモード時もここだけ colors.bg（白）を使う
  qrWrap: { padding: space.lg, backgroundColor: colors.bg, borderRadius: radius.md },
})
