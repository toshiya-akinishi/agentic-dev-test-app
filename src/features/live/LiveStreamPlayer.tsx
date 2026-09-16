/**
 * ライブ配信プレイヤー（T-12-12 / 要求 2-1, 2-2 / 補-2-1-1, 2 / 補-2-2-1〜3・MOCK）。
 * 実配信基盤には接続せず `streamUrl`（サンプル HLS/ローカル動画）で再生する。
 * 補-2-1-2: `status=ended` になったら自動的に `archiveVideo` へ切り替える。
 */
import { useVideoPlayer, VideoView } from 'expo-video'
import { useAtomValue } from 'jotai'
import React, { useEffect, useMemo, useRef } from 'react'
import { StyleSheet, View } from 'react-native'

import { Badge, Txt } from '../../components/ui'
import { mediaUrl, relDoc } from '../common'
import { createVideoProgressTracker, trackVideoComplete, trackVideoStart } from '../../lib/analytics'
import { formatDelay, LIVE_KIND_LABELS } from '../../queries/liveStreams'
import { autoplayEnabledAtom } from '../../store/network'
import { colors, radius, space } from '../../theme'
import type { LiveStream, Video } from '../../types/payload'

export const LiveStreamPlayer = ({ stream }: { stream: LiveStream }) => {
  const archiveVideo = relDoc<Video>(stream.archiveVideo)
  const ended = stream.status === 'ended'
  /** 補-8-2-1(a): 低速時は自動再生を止める。ネイティブコントロールから手動再生できる */
  const autoplayEnabled = useAtomValue(autoplayEnabledAtom)

  // 補-2-1-2: 終了後はアーカイブ動画へ、それ以外は streamUrl（MOCK）で再生
  const source = useMemo(() => {
    if (ended) return mediaUrl(archiveVideo?.file) ?? archiveVideo?.hlsUrl ?? null
    return stream.streamUrl ?? null
  }, [ended, archiveVideo, stream.streamUrl])

  const player = useVideoPlayer(source, (p) => {
    p.loop = true
    p.timeUpdateEventInterval = 1
    if (!ended && autoplayEnabled) p.play()
  })

  /** T-15-6: アーカイブ再生時のみ視聴進捗を計測する（ライブ本編は継続的なため対象外） */
  const tracker = useRef(createVideoProgressTracker(archiveVideo?.id ?? stream.id)).current
  const startedRef = useRef(false)
  useEffect(() => {
    if (!ended || !archiveVideo) return
    const endSub = player.addListener('playToEnd', () => trackVideoComplete(archiveVideo.id))
    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying && !startedRef.current) {
        startedRef.current = true
        trackVideoStart(archiveVideo.id)
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
  }, [player, ended, archiveVideo?.id])

  return (
    <View>
      <View style={styles.playerBox}>
        {source ? (
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallback]}>
            <Txt size="xxl">📡</Txt>
            <Txt size="sm" color={colors.textInverse}>
              配信準備中です
            </Txt>
          </View>
        )}
      </View>

      <View style={styles.metaRow}>
        <Badge label={LIVE_KIND_LABELS[stream.kind]} />
        {ended ? (
          <Badge label="アーカイブ配信中" color={colors.textInverse} bg={colors.textSub} />
        ) : (
          <Badge label={`追っかけ再生・${formatDelay(stream.delaySec)}`} color={colors.textInverse} bg={colors.live} />
        )}
      </View>

      <Txt weight="bold" size="lg" style={{ marginTop: space.sm }}>
        {stream.title}
      </Txt>
    </View>
  )
}

const styles = StyleSheet.create({
  playerBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  fallback: { alignItems: 'center', justifyContent: 'center', gap: space.xs },
  metaRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
})
