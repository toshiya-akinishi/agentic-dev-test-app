/**
 * ガイド記事の画像・動画ブロック（補-1-1-2）。
 * 1 記事 = 見出し + 本文リッチテキスト + 画像 0..n + 動画 0..1。
 * 動画は `videos` コレクションへの参照であり、ガイド専用のアップロードは持たない。
 */
import { Image } from 'expo-image'
import { useVideoPlayer, VideoView } from 'expo-video'
import React, { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { formatDuration } from '../../lib/format'
import { resolveMediaUrl } from '../../lib/richtext'
import { colors, radius, space } from '../../theme'
import type { Media, Video } from '../../types/payload'

const asObject = <T,>(value: unknown): T | undefined =>
  value && typeof value === 'object' ? (value as T) : undefined

/* ---------------- 画像 0..n ---------------- */

type GalleryImage = { url: string; alt?: string; caption?: string }

const toGalleryImages = (images: GuideImages): GalleryImage[] =>
  (images ?? [])
    .map((item) => asObject<Media>(item))
    .map((m): GalleryImage | null => {
      const url = resolveMediaUrl(m?.url)
      return url ? { url, alt: m?.alt ?? undefined, caption: m?.caption ?? undefined } : null
    })
    .filter((i): i is GalleryImage => i !== null)

type GuideImages = (number | Media)[] | null | undefined

export const GuideImageGallery = ({ images }: { images: GuideImages }) => {
  const list = toGalleryImages(images)
  const [viewing, setViewing] = useState<GalleryImage | null>(null)

  if (!list.length) return null

  return (
    <View style={styles.block}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.galleryRow}
      >
        {list.map((image, i) => (
          <Pressable
            key={`${image.url}-${i}`}
            accessibilityRole="imagebutton"
            accessibilityLabel={image.alt ?? '写真を拡大'}
            onPress={() => setViewing(image)}
            style={({ pressed }) => pressed && { opacity: 0.8 }}
          >
            <Image source={{ uri: image.url }} contentFit="cover" style={styles.galleryImage} />
            {image.caption ? (
              <Txt size="xs" color={colors.textMuted} numberOfLines={1} style={styles.caption}>
                {image.caption}
              </Txt>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={viewing !== null} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewing(null)}>
          {viewing ? (
            <Image
              source={{ uri: viewing.url }}
              contentFit="contain"
              accessibilityLabel={viewing.alt}
              style={styles.viewerImage}
            />
          ) : null}
          <Txt size="sm" color={colors.textInverse} style={styles.viewerHint}>
            タップで閉じる
          </Txt>
        </Pressable>
      </Modal>
    </View>
  )
}

/* ---------------- 動画 0..1 ---------------- */

/** 再生できるソースを 1 つ選ぶ。ローカルファイル優先、無ければ HLS（補-2-2-3 の差し替え点） */
const videoSourceOf = (video: Video): string | null => {
  const file = asObject<Media>(video.file)
  return resolveMediaUrl(file?.url) ?? video.hlsUrl ?? null
}

export const GuideVideo = ({ video }: { video: number | Video | null | undefined }) => {
  const doc = asObject<Video>(video)
  const source = doc ? videoSourceOf(doc) : null
  // フックは常に同じ順序で呼ぶ。source が null のときはプレイヤーを持たない
  const player = useVideoPlayer(source, (p) => {
    p.loop = false
  })

  if (!doc) return null

  const thumbnail = resolveMediaUrl(asObject<Media>(doc.thumbnail)?.url)

  return (
    <View style={styles.block}>
      <Txt weight="bold" size="md" style={{ marginBottom: space.sm }}>
        動画で見る
      </Txt>

      {source ? (
        <VideoView
          player={player}
          style={styles.video}
          nativeControls
          fullscreenOptions={{ enable: true }}
          contentFit="contain"
        />
      ) : thumbnail ? (
        <Image source={{ uri: thumbnail }} contentFit="cover" style={styles.video} />
      ) : (
        <View style={[styles.video, styles.videoFallback]}>
          <Txt size="xxl">🎬</Txt>
        </View>
      )}

      <View style={styles.videoMeta}>
        <Txt size="sm" color={colors.textSub} numberOfLines={2} style={{ flex: 1 }}>
          {doc.title}
        </Txt>
        {doc.durationSec ? (
          <Txt size="sm" color={colors.textMuted}>
            {formatDuration(doc.durationSec)}
          </Txt>
        ) : null}
      </View>

      {!source ? (
        <Txt size="xs" color={colors.textMuted}>
          この動画は現在再生できません。
        </Txt>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  block: { marginBottom: space.xl, gap: space.xs },
  galleryRow: { gap: space.md, paddingRight: space.lg },
  galleryImage: {
    width: 260,
    height: 170,
    borderRadius: radius.md,
    backgroundColor: colors.bgSubtle,
  },
  caption: { marginTop: space.xs, maxWidth: 260 },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: colors.bgSubtle,
  },
  videoFallback: { alignItems: 'center', justifyContent: 'center' },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.xs,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    gap: space.lg,
  },
  viewerImage: { width: '100%', height: '75%' },
  viewerHint: { opacity: 0.8 },
})
