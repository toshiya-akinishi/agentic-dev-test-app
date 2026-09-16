/**
 * 動画のいいねボタン（2-11 / 補-2-11-1）。動画カード・動画詳細から共通で使う。
 * ログイン不要（ゲストは deviceId 紐づけ）。
 */
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { Txt } from '../../components/ui'
import { alertMutationError } from '../../lib/mutationFeedback'
import { useLikedVideos, useToggleVideoLike } from '../../queries/likes'
import { radius } from '../../theme'

export const LikeButton = ({
  videoId,
  size = 'md',
}: {
  videoId: number
  size?: 'sm' | 'md'
}) => {
  const { likedVideoIds, likeIdByVideoId } = useLikedVideos()
  const toggle = useToggleVideoLike()
  const liked = likedVideoIds.has(videoId)

  const onPress = () => {
    toggle.mutate(
      { videoId, likeId: likeIdByVideoId.get(videoId) },
      { onError: (e) => alertMutationError(e) },
    )
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={liked ? 'いいねを解除' : 'いいねする'}
      accessibilityState={{ selected: liked }}
      disabled={toggle.isPending}
      onPress={onPress}
      style={[styles.btn, size === 'sm' && styles.btnSm, liked && styles.btnActive]}
      hitSlop={8}
    >
      <Txt size={size === 'sm' ? 'sm' : 'md'}>{liked ? '❤️' : '🤍'}</Txt>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSm: { width: 30, height: 30 },
  btnActive: { backgroundColor: 'rgba(0,0,0,0.5)' },
})
