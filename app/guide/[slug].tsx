/**
 * 観戦ガイド記事詳細 `/guide/[slug]`（要求 1-1）。
 * 補-1-1-2: 見出し + 本文リッチテキスト + 画像 0..n + 動画 0..1（動画は videos への参照）。
 * 補-1-2-3: 用語へのリンクは CMS で手動設定されたものだけを辿る（自動リンク化はしない）。
 */
import { Stack, router, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { Linking, ScrollView, StyleSheet, View } from 'react-native'

import { Badge, EmptyState, ErrorView, SkeletonList, Txt } from '../../src/components/ui'
import { OfflineBar } from '../../src/components/OfflineBar'
import { internalRouteFor } from '../../src/features/common'
import { GuideImageGallery, GuideVideo } from '../../src/features/guide'
import { formatDateFull } from '../../src/lib/format'
import { RichText, type RichTextLinkTarget } from '../../src/lib/richtext'
import { guideCategoryLabel, useGuideArticle } from '../../src/queries/guide'
import { colors, space } from '../../src/theme'

/** 手動設定されたリンクの遷移先を決める（補-1-2-3） */
const openLink = (target: RichTextLinkTarget) => {
  const route = internalRouteFor(target)
  if (route) {
    router.push(route)
    return
  }
  if (target.url) void Linking.openURL(target.url).catch(() => undefined)
}

export default function GuideArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { article, isLoading, error, refetch } = useGuideArticle(slug)

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: '観戦ガイド' }} />
        <OfflineBar />
        <SkeletonList rows={6} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: '観戦ガイド' }} />
        <OfflineBar />
        <ErrorView error={error} onRetry={() => void refetch()} />
      </View>
    )
  }

  if (!article) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: '観戦ガイド' }} />
        <OfflineBar />
        <EmptyState
          icon="📖"
          title="記事が見つかりませんでした"
          description="公開が終了した記事の可能性があります。ガイド一覧からお探しください。"
          actionLabel="ガイド一覧へ"
          onAction={() => router.push('/guide')}
        />
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: guideCategoryLabel(article.category) }} />
      <OfflineBar />

      {/* 補-1-1-2: 見出し */}
      <View style={styles.header}>
        <Badge label={guideCategoryLabel(article.category)} color={colors.primary} bg="#E7F1EA" />
        <Txt size="xxl" weight="bold">
          {article.title}
        </Txt>
        <Txt size="xs" color={colors.textMuted}>
          {`更新: ${formatDateFull(article.updatedAt)}`}
        </Txt>
      </View>

      {/* 補-1-1-2: 画像 0..n */}
      <GuideImageGallery images={article.images} />

      {/* 補-1-1-2: 本文リッチテキスト */}
      <RichText value={article.body} onPressLink={openLink} />

      {/* 補-1-1-2: 動画 0..1（videos への参照） */}
      <GuideVideo video={article.video} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xxl },
  header: { gap: space.sm, marginBottom: space.lg },
})
