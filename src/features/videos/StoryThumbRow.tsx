/**
 * 動画一覧上部の「ストーリー用の丸サムネ列」（04-screen-spec.md 2章: 動画一覧 `/videos`）。
 * タップで縦型ストーリービューア `/stories` へ（要求 2-12）。
 */
import { Image } from 'expo-image'
import { router } from 'expo-router'
import React from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { mediaUrl } from '../common'
import { useStoryFeed } from '../../queries/stories'
import { colors, space } from '../../theme'

const THUMB = 64

export const StoryThumbRow = () => {
  const { items, isLoading } = useStoryFeed()

  if (isLoading) return null
  if (!items.length) return null

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.slice(0, 15).map((v, i) => (
          <Pressable
            key={v.id}
            accessibilityRole="button"
            onPress={() => router.push(`/stories?index=${i}`)}
            style={styles.item}
          >
            <Image source={{ uri: mediaUrl(v.thumbnail, 'thumb') }} contentFit="cover" style={styles.thumb} />
            <Txt size="xs" numberOfLines={1} style={styles.caption}>
              {v.title}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingTop: space.md },
  row: { gap: space.md, paddingHorizontal: space.lg },
  item: { width: THUMB + 12, alignItems: 'center' },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.bgSubtle,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  caption: { width: THUMB + 12, textAlign: 'center', marginTop: 4 },
})
