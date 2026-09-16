/**
 * マイページ「チケット」`/mypage/tickets`（T-07-9 / 要求 5-3）。
 * 補-5-3-1: 有効（status=paid かつ有効日が当日以降）は「有効」セクション、それ以外は「履歴」セクション。
 * 補-5-3-3: `tickets` は PERSISTED_KEY_ROOTS に含まれておりオフラインでも直近取得分を表示できる。
 */
import { router, Stack } from 'expo-router'
import { useAtomValue } from 'jotai'
import React, { useMemo } from 'react'
import { SectionList, StyleSheet, View } from 'react-native'

import { EmptyState, ErrorView, Loading, Txt } from '../../src/components/ui'
import { relDoc } from '../../src/features/common'
import { TicketOrderRow } from '../../src/features/tickets'
import { isTicketOrderValid } from '../../src/lib/tickets'
import { useMyTicketOrders } from '../../src/queries/tickets'
import { isGuestAtom } from '../../src/store/auth'
import { colors, space } from '../../src/theme'
import type { TicketOrder, TicketType } from '../../src/types/payload'

export default function MyTicketsScreen() {
  const isGuest = useAtomValue(isGuestAtom)
  const { data, isLoading, error, refetch } = useMyTicketOrders()
  const orders = data?.docs ?? []

  const sections = useMemo(() => {
    const valid: TicketOrder[] = []
    const history: TicketOrder[] = []
    for (const o of orders) {
      const ticketType = relDoc<TicketType>(o.ticketType)
      if (isTicketOrderValid(o.status, ticketType?.validDate)) valid.push(o)
      else history.push(o)
    }
    return [
      ...(valid.length ? [{ title: '有効', data: valid }] : []),
      ...(history.length ? [{ title: '履歴', data: history }] : []),
    ]
  }, [orders])

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'チケット' }} />
      {isGuest ? (
        <EmptyState
          icon="🎫"
          title="ログインするとチケットを確認できます"
          actionLabel="ログイン"
          onAction={() => router.push('/auth/login')}
        />
      ) : isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : sections.length === 0 ? (
        <EmptyState icon="🎫" title="チケットはまだありません" description="大会詳細のチケットブロックから購入できます。" />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TicketOrderRow order={item} onPress={() => router.push(`/ticket/${item.id}`)} />
          )}
          renderSectionHeader={({ section }) => (
            <Txt weight="bold" style={styles.sectionTitle}>
              {section.title}
            </Txt>
          )}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: space.lg, paddingBottom: space.xxl },
  sectionTitle: { marginTop: space.lg, marginBottom: space.sm, color: colors.textMuted },
})
