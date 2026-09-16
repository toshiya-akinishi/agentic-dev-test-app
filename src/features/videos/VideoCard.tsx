/**
 * 動画一覧のグリッドカード（T-12-1 / 補-2-8-2: 2 列グリッド）。
 */
import { Image } from 'expo-image'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Badge, Txt } from '../../components/ui'
import { mediaUrl } from '../common'
import { formatDuration } from '../../lib/format'
import { videoTagLabel } from '../../queries/videos'
import { colors, radius, space } from '../../theme'
import type { Video } from '../../types/payload'
import { LikeButton } from './LikeButton'

export const VideoCard = ({ video, onPress }: { video: Video; onPress: () => void }) => {
  const primaryTag = video.tags?.[0]
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View>
        <Image source={{ uri: mediaUrl(video.thumbnail, 'card') }} contentFit="cover" style={styles.thumb} />
        {video.durationSec ? (
          <View style={styles.durationBadge}>
            <Txt size="xs" color={colors.textInverse}>
              {formatDuration(video.durationSec)}
            </Txt>
          </View>
        ) : null}
        {primaryTag ? (
          <View style={styles.tagBadge}>
            <Badge label={videoTagLabel(primaryTag)} color={colors.textInverse} bg="rgba(11,93,46,0.85)" />
          </View>
        ) : null}
        <View style={styles.likeOverlay}>
          <LikeButton videoId={video.id} size="sm" />
        </View>
      </View>
      <Txt size="sm" weight="medium" numberOfLines={2} style={styles.title}>
        {video.title}
      </Txt>
      <View style={styles.metaRow}>
        <Txt size="xs" color={colors.textMuted} numberOfLines={1} style={{ flex: 1 }}>
          {[video.hole ? `${video.hole}H` : null].filter(Boolean).join(' ・ ')}
        </Txt>
        <Txt size="xs" color={colors.textMuted}>
          ❤ {video.likeCount ?? 0}
        </Txt>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: space.xs },
  thumb: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    backgroundColor: colors.bgSubtle,
  },
  durationBadge: {
    position: 'absolute',
    right: space.xs,
    bottom: space.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagBadge: { position: 'absolute', left: space.xs, top: space.xs },
  likeOverlay: { position: 'absolute', right: space.xs, top: space.xs },
  title: { paddingHorizontal: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
})
