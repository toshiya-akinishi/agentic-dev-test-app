/**
 * プレイリストの一覧カード（T-12-9 / 要求 2-23）。お気に入り一覧のプレイリストタブから使う。
 */
import { Image } from 'expo-image'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Badge, Txt } from '../../components/ui'
import { mediaUrl, relDoc } from '../common'
import { colors, radius, space } from '../../theme'
import type { Playlist, Video } from '../../types/payload'

export const PlaylistCard = ({ playlist, onPress }: { playlist: Playlist; onPress: () => void }) => {
  const first = relDoc<Video>(playlist.items?.[0])
  const count = playlist.items?.length ?? 0

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Image source={{ uri: mediaUrl(first?.thumbnail, 'card') }} contentFit="cover" style={styles.thumb} />
      <View style={{ flex: 1 }}>
        <Txt weight="bold" numberOfLines={1}>
          {playlist.name}
        </Txt>
        <Txt size="xs" color={colors.textMuted}>
          {count}本
        </Txt>
      </View>
      {playlist.isPublic ? <Badge label="共有中" color={colors.textInverse} bg={colors.primary} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thumb: { width: 64, height: 48, borderRadius: radius.sm, backgroundColor: colors.bgSubtle },
})
