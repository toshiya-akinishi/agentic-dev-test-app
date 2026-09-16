/**
 * ホーム最上部のハイライトカルーセル（要求 2-14 / 補-2-14-1）。
 * 全ユーザー共通・最大8件・5秒自動送り。低速モード時（補-8-2-1(a)）は自動送りを止める
 * （スワイプでの手動送りは常に可能）。
 */
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useAtomValue } from 'jotai'
import React, { useEffect, useRef, useState } from 'react'
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native'

import { Skeleton, Txt } from '../../components/ui'
import { mediaUrl } from '../common'
import { HOME_CAROUSEL_INTERVAL_MS, useHomeCarousel } from '../../queries/highlights'
import { autoplayEnabledAtom } from '../../store/network'
import { colors, radius, space } from '../../theme'
import type { Video } from '../../types/payload'

export const HighlightCarousel = () => {
  const { slides, isLoading } = useHomeCarousel()
  const autoplay = useAtomValue(autoplayEnabledAtom)
  const { width } = useWindowDimensions()
  const [index, setIndex] = useState(0)
  const listRef = useRef<FlatList<Video>>(null)

  useEffect(() => {
    if (!autoplay || slides.length < 2) return
    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % slides.length
        listRef.current?.scrollToOffset({ offset: next * width, animated: true })
        return next
      })
    }, HOME_CAROUSEL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [autoplay, slides.length, width])

  if (isLoading) return <Skeleton height={200} style={styles.loadingSkeleton} />
  // カルーセルが空/取得失敗でもホーム全体は表示し続ける（致命的なエラーにしない）
  if (slides.length === 0) return null

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
  }

  return (
    <View>
      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/video/${item.id}`)}
            style={{ width }}
          >
            <Image
              source={{ uri: mediaUrl(item.thumbnail, 'hero') }}
              contentFit="cover"
              style={[styles.slideImage, { width }]}
            />
            <View style={styles.caption}>
              <Txt weight="bold" color={colors.textInverse} numberOfLines={2}>
                {item.title}
              </Txt>
            </View>
          </Pressable>
        )}
      />
      {slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View key={s.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  loadingSkeleton: { margin: space.lg, borderRadius: radius.md },
  slideImage: { aspectRatio: 16 / 9, backgroundColor: colors.bgSubtle },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.xs,
    marginTop: space.sm,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 16 },
})
