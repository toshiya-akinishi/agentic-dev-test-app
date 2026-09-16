/**
 * 大会詳細 ニュースタブ `/tournament/[id]/news`（補-1-8-1, 補-1-9-1 / 要求 1-9）。
 * EP-06 で作った `useNewsList` / `useTournamentEntrantIds` をそのまま使い、
 * 「当該大会に紐づくニュース + 出場選手に紐づくニュース」を新着順・無限スクロールで表示する。
 */
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { FlatList, StyleSheet, View } from 'react-native'

import { EmptyState, ErrorView, Loading, Txt } from '../../../src/components/ui'
import { NewsCard } from '../../../src/features/news'
import { TournamentTabs } from '../../../src/features/tournaments'
import { useNewsList, useTournamentEntrantIds } from '../../../src/queries/news'
import { colors, space } from '../../../src/theme'

export default function TournamentNewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const entrantPlayerIds = useTournamentEntrantIds(id)
  const { items, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useNewsList({
    tournamentId: id,
    entrantPlayerIds,
  })

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'ニュース' }} />
      <TournamentTabs tournamentId={id} active="news" />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="📰" title="この大会に関連するニュースはまだありません" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <NewsCard news={item} onPress={() => router.push(`/news/${item.id}`)} />}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          contentContainerStyle={styles.list}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage) void fetchNextPage()
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <Txt size="sm" color={colors.textMuted} style={{ textAlign: 'center', padding: space.lg }}>
                読み込み中…
              </Txt>
            ) : null
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: space.lg, paddingBottom: space.xxl },
})
