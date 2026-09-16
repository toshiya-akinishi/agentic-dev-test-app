/**
 * 観戦ガイド一覧 `/guide`（要求 1-1 / 04-screen-spec.md 1章）。
 * 補-1-1-1: マナー / ルール / はじめて の 3 カテゴリをタブで切り替える。
 */
import { Stack, router } from 'expo-router'
import React, { useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'

import {
  Button,
  EmptyState,
  ErrorView,
  SkeletonList,
  Tabs,
  Txt,
} from '../../src/components/ui'
import { OfflineBar } from '../../src/components/OfflineBar'
import { GuideArticleCard } from '../../src/features/guide'
import { GUIDE_CATEGORIES, useGuideArticles, type GuideCategory } from '../../src/queries/guide'
import { colors, space } from '../../src/theme'

export default function GuideIndexScreen() {
  // 補-1-1-1: 3 カテゴリのタブ。既定は「はじめて」（初心者ガイドが入口のため）
  const [category, setCategory] = useState<GuideCategory>('beginner')
  const { data, isLoading, error, refetch } = useGuideArticles(category)
  const articles = data?.docs ?? []

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: '観戦ガイド' }} />
      <OfflineBar />

      <Tabs
        value={category}
        options={GUIDE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
        onChange={setCategory}
      />

      {isLoading ? (
        <SkeletonList rows={5} />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : articles.length === 0 ? (
        <EmptyState
          icon="📖"
          title="このカテゴリの記事はまだありません"
          description="ほかのカテゴリを見るか、用語集からゴルフの言葉を調べてみましょう。"
          actionLabel="用語集を見る"
          onAction={() => router.push('/glossary')}
        />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <GuideArticleCard
              article={item}
              onPress={() => router.push(`/guide/${item.slug}`)}
            />
          )}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            <View style={styles.footer}>
              <Txt size="sm" color={colors.textSub} style={{ textAlign: 'center' }}>
                わからない言葉が出てきたら
              </Txt>
              <Button
                title="ゴルフ用語集を開く"
                variant="ghost"
                onPress={() => router.push('/glossary')}
              />
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  footer: { marginTop: space.xl, gap: space.md },
})
