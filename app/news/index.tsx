/**
 * ニュース一覧 `/news`（要求 1-9 / 補-1-9-1）。
 * カテゴリ絞り込み（すべて/大会/選手/お知らせ）＋ 無限スクロール（20件/ページ）。
 */
import { Stack, router } from 'expo-router'
import React, { useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native'

import { EmptyState, ErrorView, SkeletonList, Tabs } from '../../src/components/ui'
import { NewsCard } from '../../src/features/news'
import { NEWS_CATEGORY_OPTIONS, useNewsList, type NewsCategory } from '../../src/queries/news'
import { colors, space } from '../../src/theme'

export default function NewsListScreen() {
  const [category, setCategory] = useState<NewsCategory>('all')
  const {
    items,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNewsList({ category })

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'ニュース' }} />

      <Tabs value={category} options={NEWS_CATEGORY_OPTIONS} onChange={setCategory} scrollable />

      {isLoading ? (
        <SkeletonList rows={6} />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="📰" title="ニュースがありません" description="このカテゴリの記事はまだ公開されていません。" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <NewsCard news={item} onPress={() => router.push(`/news/${item.id}`)} />
          )}
          contentContainerStyle={styles.list}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: space.lg }} color={colors.primary} />
            ) : null
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
})
