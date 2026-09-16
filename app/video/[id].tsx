/**
 * 動画詳細 `/video/[id]`（T-12-2 / 要求 2-9 / 補-2-9-1, 2）。
 * プレイヤー + メタデータ全項目 + ミニマップ（打点→停止点）。いいね・シェア・
 * プレイリスト追加・タグからの絞り込み導線も持つ（2-10, 2-11, 2-21, 2-23）。
 */
import { useVideoPlayer, VideoView } from 'expo-video'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useSetAtom } from 'jotai'
import React, { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { ErrorView, Loading, Txt } from '../../src/components/ui'
import { AdSlot } from '../../src/features/ads'
import { mediaUrl, relId } from '../../src/features/common'
import { AddToPlaylistSheet } from '../../src/features/playlist'
import { LikeButton, ShareButton, TagBadgeRow, VideoMetaPanel } from '../../src/features/videos'
import { createVideoProgressTracker, trackVideoComplete, trackVideoStart } from '../../src/lib/analytics'
import { useVideo } from '../../src/queries/videos'
import { videoFiltersAtom } from '../../src/store/ui'
import { colors, space } from '../../src/theme'

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: video, isLoading, error, refetch } = useVideo(id)
  const setFilters = useSetAtom(videoFiltersAtom)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  /** 補-8-3-1: video_pre（本編再生前のCM）。広告なし/終了/スキップいずれでも本編へ進む */
  const [adDone, setAdDone] = useState(false)

  const source = video ? mediaUrl(video.file) ?? video.hlsUrl ?? null : null
  const player = useVideoPlayer(source, (p) => {
    p.loop = false
    p.timeUpdateEventInterval = 1
  })
  const tracker = useRef(createVideoProgressTracker(video?.id ?? id)).current
  const startedRef = useRef(false)

  useEffect(() => {
    if (!video) return
    const endSub = player.addListener('playToEnd', () => trackVideoComplete(video.id))
    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying && !startedRef.current) {
        startedRef.current = true
        trackVideoStart(video.id)
      }
    })
    const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
      tracker.onProgress(currentTime, player.duration)
    })
    return () => {
      endSub.remove()
      playingSub.remove()
      timeSub.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, video?.id])

  if (isLoading) return <Loading />
  if (error || !video) return <ErrorView error={error} onRetry={() => void refetch()} />

  const goToTag = (tag: string) => {
    setFilters({ sort: 'newest', tag })
    router.push('/videos')
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: video.title }} />
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
        <View style={styles.playerBox}>
          {!adDone ? (
            <AdSlot
              slot="video_pre"
              tournamentId={relId(video.tournament)}
              playerId={relId(video.player)}
              onFinish={() => setAdDone(true)}
              style={StyleSheet.absoluteFill}
            />
          ) : source ? (
            <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.fallback]}>
              <Txt size="xxl">🎬</Txt>
            </View>
          )}
        </View>

        <View style={styles.actionsRow}>
          <LikeButton videoId={video.id} />
          <ShareButton video={video} />
          <PlusButton onPress={() => setAddSheetOpen(true)} />
        </View>

        <View style={{ paddingHorizontal: space.lg }}>
          <Txt size="lg" weight="bold">
            {video.title}
          </Txt>
          <View style={{ marginTop: space.sm }}>
            <TagBadgeRow tags={video.tags ?? []} onPressTag={goToTag} />
          </View>
        </View>

        <VideoMetaPanel video={video} />
      </ScrollView>

      <AddToPlaylistSheet visible={addSheetOpen} onClose={() => setAddSheetOpen(false)} videoId={video.id} />
    </View>
  )
}

const PlusButton = ({ onPress }: { onPress: () => void }) => (
  <Pressable onPress={onPress} style={styles.plusBtn} hitSlop={8}>
    <Txt size="sm" color={colors.primary} weight="bold">
      ➕ プレイリストに追加
    </Txt>
  </Pressable>
)

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  playerBox: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  plusBtn: { marginLeft: 'auto' },
})
