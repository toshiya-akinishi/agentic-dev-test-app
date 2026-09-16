/**
 * お気に入りショット登録ボタン（T-11-9 / 1-45 / 補-1-45-1）。
 * 動画の `LikeButton`（2-11）と同じ `likes` コレクションの `shot` 側を使う。
 */
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { Txt } from '../../components/ui'
import { useLikedShots, useToggleShotLike } from '../../queries/likes'
import { colors, radius, space } from '../../theme'

export const ShotLikeButton = ({ shotId }: { shotId: number }) => {
  const { likedShotIds, likeIdByShotId } = useLikedShots()
  const toggle = useToggleShotLike()
  const liked = likedShotIds.has(shotId)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={liked ? 'ショットのお気に入りを解除' : 'ショットをお気に入りに追加'}
      accessibilityState={{ selected: liked }}
      disabled={toggle.isPending}
      onPress={() => toggle.mutate({ shotId, likeId: likeIdByShotId.get(shotId) })}
      style={[styles.btn, liked && styles.btnActive]}
      hitSlop={8}
    >
      <Txt size="md">{liked ? '❤️' : '🤍'}</Txt>
      <Txt size="sm" weight="bold" color={liked ? colors.primary : colors.textSub}>
        {liked ? 'お気に入り済み' : 'お気に入りに追加'}
      </Txt>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnActive: { borderColor: colors.primary },
})
