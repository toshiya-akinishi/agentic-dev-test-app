/**
 * ニュース詳細 `/news/[id]`（要求 1-10）。
 * 補-1-10-1: リッチテキスト（見出し/段落/画像/リンク/引用）をレンダリングし、画像タップで全画面ビューア。
 * 補-1-10-2: 記事下部に「関連選手」「関連大会」チップを置く。
 */
import { Image } from 'expo-image'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import React, { useState } from 'react'
import { Linking, ScrollView, StyleSheet, View } from 'react-native'

import { Badge, EmptyState, ErrorView, SkeletonList, Txt } from '../../src/components/ui'
import { internalRouteFor, mediaUrl } from '../../src/features/common'
import { ImageViewerModal, RelatedChips } from '../../src/features/news'
import { formatDateFull } from '../../src/lib/format'
import { RichText, type RichTextImage, type RichTextLinkTarget } from '../../src/lib/richtext'
import { newsCategoryLabel, useNewsItem } from '../../src/queries/news'
import { colors, space } from '../../src/theme'

/** 手動設定されたリンクの遷移先を決める（補-1-2-3 と同じ方針をニュース本文にも適用） */
const openLink = (target: RichTextLinkTarget) => {
  const route = internalRouteFor(target)
  if (route) {
    router.push(route)
    return
  }
  if (target.url) void Linking.openURL(target.url).catch(() => undefined)
}

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: news, isLoading, error, refetch } = useNewsItem(id)
  const [viewingImage, setViewingImage] = useState<RichTextImage | null>(null)

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'ニュース' }} />
        <SkeletonList rows={6} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'ニュース' }} />
        <ErrorView error={error} onRetry={() => void refetch()} />
      </View>
    )
  }

  if (!news) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'ニュース' }} />
        <EmptyState
          icon="📰"
          title="記事が見つかりませんでした"
          description="公開が終了した記事の可能性があります。ニュース一覧からお探しください。"
          actionLabel="ニュース一覧へ"
          onAction={() => router.push('/news')}
        />
      </View>
    )
  }

  const hero = mediaUrl(news.heroImage, 'hero')

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'ニュース' }} />

      {hero ? <HeroImage uri={hero} onPress={() => setViewingImage({ url: hero })} /> : null}

      <View style={styles.header}>
        <View style={styles.metaRow}>
          {news.isPinned ? <Badge label="注目" color={colors.textInverse} bg={colors.accent} /> : null}
          {news.category ? <Badge label={newsCategoryLabel(news.category)} color={colors.primary} bg="#E7F1EA" /> : null}
        </View>
        <Txt size="xxl" weight="bold">
          {news.title}
        </Txt>
        <Txt size="xs" color={colors.textMuted}>
          {formatDateFull(news.publishedAt)}
        </Txt>
      </View>

      <RichText value={news.body} onPressLink={openLink} onPressImage={setViewingImage} />

      {/* 補-1-10-2: 関連選手・関連大会 */}
      <RelatedChips news={news} />

      <ImageViewerModal image={viewingImage} onClose={() => setViewingImage(null)} />
    </ScrollView>
  )
}

/** ヒーロー画像もタップで全画面ビューアを開けるようにする（補-1-10-1） */
const HeroImage = ({ uri, onPress }: { uri: string; onPress: () => void }) => (
  <Image
    source={{ uri }}
    contentFit="cover"
    style={styles.hero}
    onTouchEnd={onPress}
    accessibilityRole="imagebutton"
  />
)

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xxl },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    backgroundColor: colors.bgSubtle,
    marginBottom: space.lg,
  },
  header: { gap: space.sm, marginBottom: space.lg },
  metaRow: { flexDirection: 'row', gap: space.xs },
})
