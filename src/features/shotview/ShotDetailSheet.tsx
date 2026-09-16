/**
 * ショットタップ時のボトムシート（T-11-6 / 補-1-38-1）。
 * メタデータ + 動画プレイヤー（存在時のみ・補-3-8-2 と同じ「無ければ非表示」方針）+
 * AI 解説（1-40）+ Trackman（1-39）+ お気に入り登録（1-45）。
 */
import { useVideoPlayer, VideoView } from 'expo-video'
import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { Sheet, Txt } from '../../components/ui'
import { mediaUrl, relDoc } from '../common'
import { CLUB_LABELS, LIE_LABELS } from '../../lib/shotText'
import { shotCommentaryText } from '../../lib/shotCommentary'
import { colors, space } from '../../theme'
import type { Player, Shot, Video } from '../../types/payload'
import { ShotLikeButton } from './ShotLikeButton'
import { TrackmanPanel } from './TrackmanPanel'

export const ShotDetailSheet = ({
  shot,
  player,
  color,
  onClose,
}: {
  shot: Shot | undefined
  player: Player | undefined
  color: string | undefined
  onClose: () => void
}) => {
  const video = shot ? relDoc<Video>(shot.video) : undefined
  const source = video ? mediaUrl(video.file) ?? video.hlsUrl ?? null : null
  const videoPlayer = useVideoPlayer(source ?? null, (p) => {
    p.loop = false
  })

  return (
    <Sheet visible={Boolean(shot)} onClose={onClose}>
      {shot ? (
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
            <Txt weight="bold" size="lg" style={{ flex: 1 }}>
              {player?.name ?? '選手'} ・ {shot.hole}H {shot.shotNo}打目
            </Txt>
          </View>

          <View style={styles.metaRow}>
            {shot.club ? <MetaChip label={CLUB_LABELS[shot.club]} /> : null}
            {shot.distanceYards ? <MetaChip label={`${Math.round(shot.distanceYards)}Y`} /> : null}
            {shot.startLie ? <MetaChip label={`${LIE_LABELS[shot.startLie]} から`} /> : null}
            {shot.endLie ? <MetaChip label={`${LIE_LABELS[shot.endLie]} へ`} /> : null}
            {shot.remainingYards ? <MetaChip label={`残り${Math.round(shot.remainingYards)}Y`} /> : null}
          </View>

          {source ? (
            <View style={styles.videoBox}>
              <VideoView player={videoPlayer} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls />
            </View>
          ) : null}

          <View style={styles.section}>
            <Txt size="sm" weight="bold" color={colors.textSub}>
              AI解説
            </Txt>
            <Txt style={{ marginTop: 4 }}>{shotCommentaryText(shot)}</Txt>
            {!shot.aiCommentary || shot.aiCommentary.trim().length === 0 ? (
              <Txt size="xs" color={colors.textMuted} style={{ marginTop: 4 }}>
                ※ ショット属性から自動生成した解説です（ADR-003）
              </Txt>
            ) : null}
          </View>

          <TrackmanPanel shot={shot} />

          <View style={{ marginTop: space.md }}>
            <ShotLikeButton shotId={shot.id} />
          </View>
        </ScrollView>
      ) : null}
    </Sheet>
  )
}

const MetaChip = ({ label }: { label: string }) => (
  <View style={styles.chip}>
    <Txt size="xs" weight="bold" color={colors.textSub}>
      {label}
    </Txt>
  </View>
)

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 12, height: 12, borderRadius: 999 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.sm },
  chip: { backgroundColor: colors.bgSubtle, borderRadius: 999, paddingHorizontal: space.sm, paddingVertical: 4 },
  videoBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: space.md,
  },
  section: { marginTop: space.md },
})
