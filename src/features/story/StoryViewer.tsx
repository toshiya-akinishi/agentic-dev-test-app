/**
 * 縦型ストーリービューア（T-12-6 / 要求 2-12 / 補-2-12-1, 2）。
 *
 * 全画面・縦スワイプで次動画・タップで一時停止・長押しで UI 非表示・前後 2 本を先読み。
 * 進捗バーは本数分を上部に表示する。1 本 15〜60 秒想定（補-2-12-2）。
 */
import { Image } from 'expo-image'
import { useVideoPlayer, VideoView } from 'expo-video'
import React, { useEffect, useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type ViewToken,
} from 'react-native'

import { Txt } from '../../components/ui'
import { mediaUrl } from '../common'
import { colors, space } from '../../theme'
import type { Video } from '../../types/payload'

/** 補-2-12-1: 前後 2 本を先読み */
const PRELOAD_WINDOW = 2

const videoSourceOf = (v: Video): string | null => mediaUrl(v.file) ?? v.hlsUrl ?? null

export const StoryViewer = ({
  items,
  initialIndex,
  onClose,
}: {
  items: Video[]
  initialIndex: number
  onClose: () => void
}) => {
  const { height, width } = Dimensions.get('window')
  const startIndex = Math.min(Math.max(initialIndex, 0), Math.max(items.length - 1, 0))
  const [index, setIndex] = useState(startIndex)
  const [uiHidden, setUiHidden] = useState(false)

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable)
    if (first && typeof first.index === 'number') setIndex(first.index)
  }).current

  if (!items.length) return null

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={(v) => String(v.id)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({ item, index: i }) => (
          <StoryItem
            video={item}
            height={height}
            width={width}
            active={i === index}
            shouldLoad={Math.abs(i - index) <= PRELOAD_WINDOW}
            uiHidden={uiHidden}
            onToggleUiHidden={() => setUiHidden((v) => !v)}
            onEnded={() => setIndex((cur) => Math.min(cur + 1, items.length - 1))}
          />
        )}
      />

      {!uiHidden ? (
        <View style={styles.progressRow} pointerEvents="none">
          {items.map((v, i) => (
            <View key={v.id} style={styles.progressTrack}>
              <View style={[styles.progressFill, i <= index && styles.progressFillDone]} />
            </View>
          ))}
        </View>
      ) : null}

      {!uiHidden ? (
        <Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={onClose} style={styles.closeBtn} hitSlop={8}>
          <Txt size="lg" color={colors.textInverse} weight="bold">
            ✕
          </Txt>
        </Pressable>
      ) : null}
    </View>
  )
}

const StoryItem = ({
  video,
  height,
  width,
  active,
  shouldLoad,
  uiHidden,
  onToggleUiHidden,
  onEnded,
}: {
  video: Video
  height: number
  width: number
  active: boolean
  shouldLoad: boolean
  uiHidden: boolean
  onToggleUiHidden: () => void
  onEnded: () => void
}) => {
  const source = shouldLoad ? videoSourceOf(video) : null
  const player = useVideoPlayer(source, (p) => {
    p.loop = false
  })
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (active) setPaused(false)
  }, [active])

  useEffect(() => {
    if (active && !paused) player.play()
    else player.pause()
  }, [active, paused, player])

  useEffect(() => {
    const sub = player.addListener('playToEnd', onEnded)
    return () => sub.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player])

  const thumb = mediaUrl(video.thumbnail, 'hero')

  return (
    <Pressable
      onPress={() => setPaused((v) => !v)}
      onLongPress={onToggleUiHidden}
      style={[styles.item, { width, height }]}
    >
      {source ? (
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      ) : thumb ? (
        <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Txt size="xxl">🎬</Txt>
        </View>
      )}

      {paused ? (
        <View style={styles.pauseOverlay} pointerEvents="none">
          <Txt size="display">▶</Txt>
        </View>
      ) : null}

      {!uiHidden ? (
        <View style={styles.caption} pointerEvents="none">
          <Txt color={colors.textInverse} weight="bold" numberOfLines={2}>
            {video.title}
          </Txt>
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  item: { backgroundColor: '#000' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  pauseOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: space.xxl,
  },
  progressRow: {
    position: 'absolute',
    top: space.xl,
    left: space.md,
    right: 48,
    flexDirection: 'row',
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', width: 0 },
  progressFillDone: { width: '100%', backgroundColor: '#FFF' },
  closeBtn: {
    position: 'absolute',
    top: space.xl,
    right: space.md,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
