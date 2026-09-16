/**
 * ライブ配信プレイヤー（T-12-12 / 要求 2-1, 2-2 / 補-2-1-1, 2 / 補-2-2-1〜3・MOCK）。
 * 実配信基盤には接続せず `streamUrl`（サンプル HLS/ローカル動画）で再生する。
 * 補-2-1-2: `status=ended` になったら自動的に `archiveVideo` へ切り替える。
 */
import { useVideoPlayer, VideoView } from 'expo-video'
import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { Badge, Txt } from '../../components/ui'
import { mediaUrl, relDoc } from '../common'
import { formatDelay, LIVE_KIND_LABELS } from '../../queries/liveStreams'
import { colors, radius, space } from '../../theme'
import type { LiveStream, Video } from '../../types/payload'

export const LiveStreamPlayer = ({ stream }: { stream: LiveStream }) => {
  const archiveVideo = relDoc<Video>(stream.archiveVideo)
  const ended = stream.status === 'ended'

  // 補-2-1-2: 終了後はアーカイブ動画へ、それ以外は streamUrl（MOCK）で再生
  const source = useMemo(() => {
    if (ended) return mediaUrl(archiveVideo?.file) ?? archiveVideo?.hlsUrl ?? null
    return stream.streamUrl ?? null
  }, [ended, archiveVideo, stream.streamUrl])

  const player = useVideoPlayer(source, (p) => {
    p.loop = true
    if (!ended) p.play()
  })

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
