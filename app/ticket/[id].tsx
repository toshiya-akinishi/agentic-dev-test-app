/**
 * 電子チケット表示 `/ticket/[id]`（T-07-9 / 要求 5-3）。
 * 補-5-3-2: QR（`qrPayload`）+ 券種名 + 大会名 + 有効日 + 注文番号 + 枚数を表示する。
 * QR はサーバ側生成ではなく `react-native-qrcode-svg` でクライアント側に描画する
 * （EP-05 の2段階認証 QR と同じライブラリ・実装パターン: `app/mypage/security.tsx` 参照）。
 */
import { Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { ErrorView, Loading } from '../../src/components/ui'
import { OfflineBar } from '../../src/components/OfflineBar'
import { TicketQrCard } from '../../src/features/tickets'
import { useTicketOrder } from '../../src/queries/tickets'
import { colors, space } from '../../src/theme'

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: order, isLoading, error, refetch } = useTicketOrder(id)

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: '電子チケット' }} />
      <OfflineBar />
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : !order ? (
        <ErrorView error={new Error('チケットが見つかりませんでした')} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <TicketQrCard order={order} />
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xxl },
})
