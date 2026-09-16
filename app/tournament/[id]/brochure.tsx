/**
 * デジタル大会パンフレット WebView `/tournament/[id]/brochure`（T-07-3 / 要求 1-13）。
 * 補-1-13-1: PDF（`pamphletPdf`）と Web URL（`pamphletWebUrl`）の両方がある場合は PDF を優先。
 * 補-1-13-2: アプリ内は WebView 表示のみ。端末保存は行わない。
 */
import { Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'

import { EmptyState, ErrorView, Loading } from '../../../src/components/ui'
import { mediaUrl } from '../../../src/features/common'
import { useTournament } from '../../../src/queries/tournaments'
import { colors } from '../../../src/theme'

export default function BrochureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: tournament, isLoading, error, refetch } = useTournament(id)

  const pdfUrl = tournament ? mediaUrl(tournament.pamphletPdf) : undefined
  // 補-1-13-1: PDF があれば優先し、無ければ外部 Web ビューア URL を使う
  const source = pdfUrl ?? tournament?.pamphletWebUrl ?? undefined

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'パンフレット' }} />
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : !source ? (
        <EmptyState icon="📄" title="パンフレットは登録されていません" />
      ) : (
        <WebView source={{ uri: source }} style={{ flex: 1 }} originWhitelist={['*']} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
})
