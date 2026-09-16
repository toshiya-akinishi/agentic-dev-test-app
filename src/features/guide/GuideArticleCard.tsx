/** 観戦ガイドの記事カード（要求 1-1 / 補-1-1-1, 補-1-1-2） */
import { Image } from 'expo-image'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Badge, Txt } from '../../components/ui'
import { richTextToPlainText, resolveMediaUrl } from '../../lib/richtext'
import { guideCategoryLabel } from '../../queries/guide'
import { colors, font, radius, space } from '../../theme'
import type { GuideArticle, Media } from '../../types/payload'

/** upload フィールドは depth によって ID か Media オブジェクトになる */
const mediaOf = (value: unknown): Media | undefined =>
  value && typeof value === 'object' ? (value as Media) : undefined

/** 記事の代表画像（補-1-1-2: 画像 0..n の 1 枚目） */
export const coverImageUrl = (article: GuideArticle): string | undefined => {
  const first = (article.images ?? [])[0]
  return resolveMediaUrl(mediaOf(first)?.url)
}

export const GuideArticleCard = ({
  article,
  onPress,
}: {
  article: GuideArticle
  onPress: () => void
}) => {
  const cover = coverImageUrl(article)
  const preview = richTextToPlainText(article.body, 80)
  const imageCount = (article.images ?? []).length
  // 補-1-1-2: 動画は 0..1 本（videos への参照）
  const hasVideo = Boolean(article.video)

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
    >
      {cover ? (
        <Image source={{ uri: cover }} contentFit="cover" style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Txt size="xxl">⛳️</Txt>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Badge label={guideCategoryLabel(article.category)} color={colors.primary} bg="#E7F1EA" />
          {hasVideo ? <Badge label="動画あり" color={colors.textInverse} bg={colors.accent} /> : null}
          {imageCount > 1 ? (
            <Badge label={`写真${imageCount}枚`} color={colors.textSub} bg={colors.bgSubtle} />
          ) : null}
        </View>

        <Txt weight="bold" size="md" numberOfLines={2}>
          {article.title}
        </Txt>

        {preview ? (
          <Txt size="sm" color={colors.textSub} numberOfLines={2} style={styles.preview}>
            {preview}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
  },
  thumb: {
    width: 96,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.bgSubtle,
  },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: space.xs, justifyContent: 'center' },
  metaRow: { flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' },
  preview: { lineHeight: font.size.sm * 1.5 },
})
