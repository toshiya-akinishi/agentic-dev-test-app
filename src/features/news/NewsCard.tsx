/** ニュース一覧・ホームの最新ニュースで共通利用するカード（要求 1-9, 1-11, 4-2） */
import { Image } from 'expo-image'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Badge, Txt } from '../../components/ui'
import { mediaUrl } from '../common'
import { richTextToPlainText } from '../../lib/richtext'
import { formatRelative } from '../../lib/format'
import { newsCategoryLabel } from '../../queries/news'
import { colors, radius, space } from '../../theme'
import type { News } from '../../types/payload'

export const NewsCard = ({ news, onPress }: { news: News; onPress: () => void }) => {
  const cover = mediaUrl(news.heroImage, 'card')
  const preview = richTextToPlainText(news.body, 70)

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
          <Txt size="xxl">📰</Txt>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.metaRow}>
          {news.isPinned ? <Badge label="注目" color={colors.textInverse} bg={colors.accent} /> : null}
          {news.category ? <Badge label={newsCategoryLabel(news.category)} /> : null}
          <Txt size="xs" color={colors.textMuted}>
            {formatRelative(news.publishedAt)}
          </Txt>
        </View>

        <Txt weight="bold" size="md" numberOfLines={2}>
          {news.title}
        </Txt>

        {preview ? (
          <Txt size="sm" color={colors.textSub} numberOfLines={2}>
            {preview}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  )
}

/** ホームの最新ニュース欄向けの横並び簡易版（04-screen-spec.md 2章「最新ニュース5件」） */
export const NewsRow = ({ news, onPress }: { news: News; onPress: () => void }) => {
  const cover = mediaUrl(news.heroImage, 'thumb')

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bgSubtle }]}
    >
      {cover ? (
        <Image source={{ uri: cover }} contentFit="cover" style={styles.rowThumb} />
      ) : (
        <View style={[styles.rowThumb, styles.thumbFallback]}>
          <Txt size="lg">📰</Txt>
        </View>
      )}
      <View style={styles.rowBody}>
        <View style={styles.metaRow}>
          {news.isPinned ? <Badge label="注目" color={colors.textInverse} bg={colors.accent} /> : null}
          <Txt size="xs" color={colors.textMuted}>
            {formatRelative(news.publishedAt)}
          </Txt>
        </View>
        <Txt weight="medium" size="sm" numberOfLines={2}>
          {news.title}
        </Txt>
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
  thumb: { width: 96, height: 72, borderRadius: radius.sm, backgroundColor: colors.bgSubtle },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: space.xs, justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' },
  row: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
  },
  rowThumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.bgSubtle },
  rowBody: { flex: 1, gap: space.xs, justifyContent: 'center' },
})
