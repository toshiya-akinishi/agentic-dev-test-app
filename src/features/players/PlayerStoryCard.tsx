/**
 * 選手詳細「ストーリー」タブのカード（T-13-4 / 4-1 / 補-4-1-1, 2）。
 * テキスト（抜粋）+ 動画サムネイル。Ph1 は公式映像ベースのラウンドハイライトに限定。
 */
import { Image } from 'expo-image'
import React from 'react'
import { StyleSheet } from 'react-native'

import { Card, Txt } from '../../components/ui'
import { mediaUrl, relDoc } from '../common'
import { formatDate } from '../../lib/format'
import { richTextToPlainText } from '../../lib/richtext'
import { colors, radius, space } from '../../theme'
import type { PlayerStory, Video } from '../../types/payload'

export const PlayerStoryCard = ({
  story,
  onPress,
}: {
  story: PlayerStory
  onPress?: () => void
}) => {
  const video = relDoc<Video>(story.video)
  const thumb = video ? mediaUrl(video.thumbnail, 'card') : undefined
  const excerpt = richTextToPlainText(story.body, 140)

  return (
    <Card onPress={onPress} style={{ gap: space.sm }}>
      {thumb ? <Image source={{ uri: thumb }} contentFit="cover" style={styles.thumb} /> : null}
      <Txt weight="bold">{story.title}</Txt>
      {excerpt ? (
        <Txt size="sm" color={colors.textSub} numberOfLines={3}>
          {excerpt}
        </Txt>
      ) : null}
      <Txt size="xs" color={colors.textMuted}>
        {formatDate(story.publishedAt)}
      </Txt>
    </Card>
  )
}

const styles = StyleSheet.create({
  thumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: colors.bgSubtle,
  },
})
