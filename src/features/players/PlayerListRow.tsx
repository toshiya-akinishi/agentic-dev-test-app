/**
 * 選手一覧の1行（T-13-1 / 4-7, 4-12）。
 * 顔写真（未登録時はイニシャル、補-8-14-1）・氏名（和/英）・ランキング順位・お気に入り★。
 */
import { Image } from 'expo-image'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { mediaUrl } from '../common'
import { colors, radius, space } from '../../theme'
import { FavoriteStarButton } from './FavoriteStarButton'
import type { Player } from '../../types/payload'

export const PlayerListRow = ({
  player,
  rank,
  onPress,
}: {
  player: Player
  rank?: number
  onPress: () => void
}) => {
  const photo = mediaUrl(player.photo, 'thumb')

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.7 }]}
      >
        <View style={styles.rank}>
          {rank ? (
            <Txt size="xs" weight="bold" color={colors.textSub}>
              {rank}
            </Txt>
          ) : null}
        </View>
        {photo ? (
          <Image source={{ uri: photo }} contentFit="cover" style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <Txt weight="bold" color={colors.textInverse}>
              {player.name.slice(0, 1)}
            </Txt>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Txt weight="medium" numberOfLines={1}>
            {player.name}
          </Txt>
          {player.nameEn ? (
            <Txt size="xs" color={colors.textMuted} numberOfLines={1}>
              {player.nameEn}
            </Txt>
          ) : null}
        </View>
      </Pressable>
      <FavoriteStarButton playerId={player.id} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rank: { width: 22, alignItems: 'center' },
  photo: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
})
