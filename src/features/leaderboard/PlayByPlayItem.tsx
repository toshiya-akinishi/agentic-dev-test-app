/** Play-by-play 1行分（3-3 / 補-3-3-1, 補-3-3-5）。動画があるショットのみサムネを出す（補-3-8-2）。 */
import { Image } from 'expo-image'
import { router } from 'expo-router'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { mediaUrl, relDoc, relId } from '../../features/common'
import { formatRelative } from '../../lib/format'
import { CLUB_LABELS, shotResultText } from '../../lib/shotText'
import { colors, radius, space } from '../../theme'
import type { Player, Shot, Video } from '../../types/payload'

export const PlayByPlayItem = ({ shot }: { shot: Shot }) => {
  const player = relDoc<Player>(shot.player)
  const video = relDoc<Video>(shot.video)
  const videoId = relId(shot.video)
  const thumb = mediaUrl(video?.thumbnail, 'thumb')

  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.headRow}>
          <Txt weight="bold" size="sm">
            {player?.name ?? '選手不明'}
          </Txt>
          <Txt size="xs" color={colors.textMuted}>
            {shot.hole}H {shot.shotNo}打目{shot.club ? ` ・ ${CLUB_LABELS[shot.club]}` : ''}
          </Txt>
        </View>
        <Txt size="sm" color={colors.textSub}>
          {shotResultText(shot)}
        </Txt>
        <Txt size="xs" color={colors.textMuted}>
          {formatRelative(shot.occurredAt)}
        </Txt>
      </View>

      {videoId ? (
        <Pressable
          onPress={() => router.push(`/video/${videoId}`)}
          accessibilityRole="button"
          accessibilityLabel="ショット動画を見る"
        >
          {thumb ? (
            <Image source={{ uri: thumb }} contentFit="cover" style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]}>
              <Txt size="lg">▶</Txt>
            </View>
          )}
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexWrap: 'wrap' },
  thumb: { width: 64, height: 48, borderRadius: radius.sm, backgroundColor: colors.bgSubtle },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
})
