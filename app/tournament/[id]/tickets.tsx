/**
 * チケット購入フロー `/tournament/[id]/tickets`（T-07-8 / 要求 5-1）。
 * 補-5-1-2: 券種選択 → 枚数選択 → 内容確認 → 決済（MOCK） → 完了。購入にはログインが必須。
 * 補-5-1-3: 販売期間外・在庫0の券種は購入不可として表示する。
 * 補-5-1-4: 決済は常に成功し status=paid・paymentRef=MOCK-xxxx を返す。
 */
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React, { useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { Button, Card, EmptyState, ErrorView, Loading, Txt } from '../../../src/components/ui'
import { useLoginGate } from '../../../src/features/auth'
import { TicketTypeCard } from '../../../src/features/tickets'
import { formatMoney } from '../../../src/lib/format'
import { isTicketTypeSaleable } from '../../../src/lib/tickets'
import { useCheckoutTicketMutation, useTicketTypes } from '../../../src/queries/tickets'
import { useTournament } from '../../../src/queries/tournaments'
import { colors, space } from '../../../src/theme'
import type { TicketOrder, TicketType } from '../../../src/types/payload'

type Step = 'select' | 'confirm' | 'success'

export default function TicketPurchaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: tournament } = useTournament(id)
  const { data: ticketTypesData, isLoading, error, refetch } = useTicketTypes(id)
  const ticketTypes = ticketTypesData?.docs ?? []

  const requireAuth = useLoginGate()
  const checkout = useCheckoutTicketMutation()

  const [step, setStep] = useState<Step>('select')
  const [selected, setSelected] = useState<TicketType | undefined>(undefined)
  const [quantity, setQuantity] = useState(1)
  const [order, setOrder] = useState<TicketOrder | undefined>(undefined)

  const goConfirm = () => {
    if (!selected) return
    if (!requireAuth('チケットの購入にはログインが必要です')) return
    setStep('confirm')
  }

  const submitPayment = () => {
    if (!selected) return
    checkout.mutate(
      { ticketType: selected, quantity },
      { onSuccess: (res) => {
          setOrder(res)
          setStep('success')
        } },
    )
  }

  if (step === 'success' && order) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: '購入完了' }} />
        <View style={styles.center}>
          <Txt size="xxl">🎉</Txt>
          <Txt size="lg" weight="bold" style={{ marginTop: space.md, textAlign: 'center' }}>
            購入が完了しました
          </Txt>
          <Txt size="sm" color={colors.textSub} style={{ marginTop: space.sm, textAlign: 'center' }}>
            注文番号 {order.orderNo}（テスト決済のため実際の請求は発生しません）
          </Txt>
          <Button
            title="電子チケットを見る"
            onPress={() => router.replace(`/ticket/${order.id}`)}
            style={{ marginTop: space.xl, alignSelf: 'stretch' }}
          />
          <Button
            title="大会詳細に戻る"
            variant="ghost"
            onPress={() => router.replace(`/tournament/${id}`)}
            style={{ marginTop: space.md, alignSelf: 'stretch' }}
          />
        </View>
      </View>
    )
  }

  if (step === 'confirm' && selected) {
    const amount = selected.price * quantity
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: '購入内容の確認' }} />
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={{ gap: space.sm }}>
            <Txt weight="bold" size="lg">
              {tournament?.name}
            </Txt>
            <Row label="券種" value={selected.name} />
            <Row label="単価" value={formatMoney(selected.price)} />
            <Row label="枚数" value={`${quantity}枚`} />
            <View style={styles.divider} />
            <Row label="合計金額" value={formatMoney(amount)} bold />
          </Card>

          <Txt size="xs" color={colors.textMuted}>
            決済は疑似実装（MOCK）です。実際のお支払いは発生しません。
          </Txt>

          {checkout.isError ? (
            <ErrorView error={checkout.error} onRetry={submitPayment} />
          ) : (
            <Button title="決済する（テスト決済）" onPress={submitPayment} loading={checkout.isPending} />
          )}
          <Button title="券種選択に戻る" variant="ghost" onPress={() => setStep('select')} />
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'チケット購入' }} />
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : ticketTypes.length === 0 ? (
        <EmptyState icon="🎫" title="この大会のチケットは現在ありません" />
      ) : (
        <>
          <FlatList
            data={ticketTypes}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TicketTypeCard
                ticketType={item}
                selected={selected?.id === item.id}
                onPress={() => {
                  setSelected(item)
                  setQuantity(1)
                }}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
            contentContainerStyle={styles.content}
          />

          {selected ? (
            <View style={styles.footer}>
              <View style={styles.stepper}>
                <Txt style={{ flex: 1 }}>枚数</Txt>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={styles.stepperBtn}
                >
                  <Txt size="lg">−</Txt>
                </Pressable>
                <Txt size="lg" weight="bold" style={{ width: 32, textAlign: 'center' }}>
                  {quantity}
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setQuantity((q) =>
                      selected.stock ? Math.min(selected.stock, q + 1) : Math.min(10, q + 1),
                    )
                  }
                  style={styles.stepperBtn}
                >
                  <Txt size="lg">＋</Txt>
                </Pressable>
              </View>
              <Button
                title={`内容を確認する（${formatMoney(selected.price * quantity)}）`}
                onPress={goConfirm}
                disabled={!isTicketTypeSaleable(selected)}
              />
            </View>
          ) : null}
        </>
      )}
    </View>
  )
}

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    <Txt color={colors.textSub}>{label}</Txt>
    <Txt weight={bold ? 'bold' : 'medium'} size={bold ? 'lg' : 'md'}>
      {value}
    </Txt>
  </View>
)

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.xs },
  footer: {
    padding: space.lg,
    gap: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSubtle,
  },
})
