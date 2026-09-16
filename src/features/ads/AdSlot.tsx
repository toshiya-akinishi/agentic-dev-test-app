/**
 * 広告枠コンポーネント（8-3, 8-5, 8-6 / 補-8-3-1〜4, 補-8-5-1, 補-8-6-1 / T-15-2, T-15-3, T-15-4）。
 *
 * `GET /api/ads/serve` を叩き、配信対象が無ければ何も描画しない（補-8-5-1）。
 * フォーマット（バナー画像 / 動画CM / タイアップ記事）は `ad-slots.format` で固定されており、
 * サーバ側がその形式のフィールドだけを埋めて返す（補-8-3-3）。
 *
 * 補-8-6-1: viewable impression（画面内に50%以上・1秒以上表示）は `useViewableImpression`
 * （`src/lib/analytics.ts`）で近似する。クリックは `linkUrl`（無ければスポンサーの landingUrl）を開く。
 *
 * `video_pre`（動画再生前CM）のように「広告を見せてから本編を再生する」用途では、
 * `onFinish` に本編再生開始のコールバックを渡す。クリエイティブが無い場合・広告が
 * 終了/スキップされた場合のどちらでも1度だけ呼ばれるので、呼び出し側は常に
 * `onFinish` 到達後に本編を表示すればよい。
 */
import { Image } from 'expo-image'
import { useVideoPlayer, VideoView } from 'expo-video'
import { router } from 'expo-router'
import { useAtomValue } from 'jotai'
import React, { useEffect, useRef, useState } from 'react'
import { Linking, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { Txt } from '../../components/ui'
import { absoluteMediaUrl, internalRouteFor } from '../common'
import { createVideoProgressTracker, trackClick, trackImpression, useViewableImpression } from '../../lib/analytics'
import { useAdSlot, type AdServeCreative, type AdSlotKey } from '../../queries/ads'
import { autoplayEnabledAtom } from '../../store/network'
import { colors, radius, space } from '../../theme'

export const AdSlot = ({
  slot,
  tournamentId,
  playerId,
  onFinish,
  style,
}: {
  slot: AdSlotKey | string
  tournamentId?: string | number
  playerId?: string | number
  /** `video_pre` などの「表示後に呼び出し側の本編へ進む」用途向け。広告なし/終了/スキップいずれでも1回呼ばれる */
  onFinish?: () => void
  style?: StyleProp<ViewStyle>
}) => {
  const { data, isLoading, isFetched } = useAdSlot(slot, { tournamentId, playerId })
  const creative = data?.creative ?? null
  const finishedRef = useRef(false)

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    onFinish?.()
  }

  useEffect(() => {
    finishedRef.current = false
  }, [slot])

  useEffect(() => {
    if (isFetched && !isLoading && !creative) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetched, isLoading, creative])

  const { onLayout } = useViewableImpression(() => {
    if (creative) trackImpression(creative.id)
  }, Boolean(creative))

  if (!creative) return null

  const onPress = () => {
    trackClick(creative.id)
    const url = creative.linkUrl ?? undefined
    if (url) void Linking.openURL(url).catch(() => undefined)
  }

  if (creative.format === 'video') {
    return (
      <AdVideoCard creative={creative} onLayout={onLayout} onPress={onPress} onFinish={finish} style={style} />
    )
  }

  if (creative.format === 'tieup_article') {
    const onPressArticle = () => {
      trackClick(creative.id)
      const route = creative.article?.id
        ? internalRouteFor({ relationTo: 'news', id: String(creative.article.id) })
        : undefined
      if (route) {
        router.push(route)
        return
      }
      const url = creative.linkUrl ?? undefined
      if (url) void Linking.openURL(url).catch(() => undefined)
    }
    return (
      <Pressable accessibilityRole="button" onLayout={onLayout} onPress={onPressArticle} style={[styles.articleCard, style]}>
        <View style={styles.sponsorRow}>
          {creative.sponsor.logoUrl ? (
            <Image source={{ uri: creative.sponsor.logoUrl }} style={styles.sponsorLogo} contentFit="contain" />
          ) : null}
          <Txt size="xs" color={colors.textMuted}>
            {creative.sponsor.name ? `PR・${creative.sponsor.name}` : 'PR'}
          </Txt>
        </View>
        <Txt weight="bold" numberOfLines={2}>
          {creative.article?.title ?? creative.name}
        </Txt>
      </Pressable>
    )
  }

  // format === 'banner'
  const imageUrl = absoluteMediaUrl(creative.banner?.imageUrl)
  if (!imageUrl) return null
  return (
    <Pressable accessibilityRole="button" onLayout={onLayout} onPress={onPress} style={[styles.bannerWrap, style]}>
      <Image
        source={{ uri: imageUrl }}
        contentFit="cover"
        style={styles.bannerImage}
        accessibilityLabel={creative.banner?.alt ?? creative.name}
      />
      <View style={styles.prBadge}>
        <Txt size="xs" color={colors.textInverse}>
          PR
        </Txt>
      </View>
    </Pressable>
  )
}

/** `video_pre` 用の動画CM。自動再生は低速時は止める（補-8-2-1(a)）。常にスキップ導線を出す */
const AdVideoCard = ({
  creative,
  onLayout,
  onPress,
  onFinish,
  style,
}: {
  creative: AdServeCreative
  onLayout: (e: import('react-native').LayoutChangeEvent) => void
  onPress: () => void
  onFinish: () => void
  style?: StyleProp<ViewStyle>
}) => {
  const autoplay = useAtomValue(autoplayEnabledAtom)
  const source = absoluteMediaUrl(creative.video?.fileUrl) ?? creative.video?.hlsUrl ?? null
  const tracker = useRef(createVideoProgressTracker(creative.video?.id ?? creative.id)).current
  const [paused, setPaused] = useState(!autoplay)

  const player = useVideoPlayer(source, (p) => {
    p.loop = false
    p.timeUpdateEventInterval = 1
    if (autoplay) p.play()
  })

  useEffect(() => {
    const endSub = player.addListener('playToEnd', onFinish)
    const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
      tracker.onProgress(currentTime, player.duration)
    })
    return () => {
      endSub.remove()
      timeSub.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player])

  const togglePlay = () => {
    if (paused) player.play()
    else player.pause()
    setPaused((v) => !v)
  }

  return (
    <View onLayout={onLayout} style={[styles.videoWrap, style]}>
      <Pressable accessibilityRole="button" onPress={togglePlay} style={StyleSheet.absoluteFill}>
        {source ? (
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
        ) : null}
        {paused ? (
          <View style={[StyleSheet.absoluteFill, styles.playOverlay]} pointerEvents="none">
            <Txt size="display" color={colors.textInverse}>
              ▶
            </Txt>
          </View>
        ) : null}
      </Pressable>

      <View style={styles.videoTopRow}>
        <View style={styles.prBadgeStatic}>
          <Txt size="xs" color={colors.textInverse}>
            広告{creative.sponsor.name ? `・${creative.sponsor.name}` : ''}
          </Txt>
        </View>
        <Pressable accessibilityRole="button" onPress={onFinish} hitSlop={8} style={styles.skipBtn}>
          <Txt size="xs" color={colors.textInverse} weight="bold">
            スキップ ›
          </Txt>
        </Pressable>
      </View>

      {creative.linkUrl ? (
        <Pressable accessibilityRole="button" onPress={onPress} style={styles.videoLinkBtn}>
          <Txt size="xs" weight="bold" color={colors.primary}>
            詳しく見る
          </Txt>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  bannerWrap: { marginHorizontal: space.lg, marginTop: space.lg },
  bannerImage: {
    width: '100%',
    aspectRatio: 320 / 100,
    borderRadius: radius.md,
    backgroundColor: colors.bgSubtle,
  },
  prBadge: {
    position: 'absolute',
    top: space.xs,
    left: space.xs,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  articleCard: {
    marginHorizontal: space.lg,
    marginTop: space.lg,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSubtle,
    gap: space.xs,
  },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  sponsorLogo: { width: 16, height: 16, borderRadius: 3 },
  videoWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  playOverlay: { alignItems: 'center', justifyContent: 'center' },
  videoTopRow: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    right: space.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prBadgeStatic: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  skipBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  videoLinkBtn: {
    position: 'absolute',
    bottom: space.sm,
    right: space.sm,
    backgroundColor: colors.textInverse,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
})
