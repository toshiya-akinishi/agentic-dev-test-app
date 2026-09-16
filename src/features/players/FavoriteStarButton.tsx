/**
 * お気に入り選手の★トグル（T-13-5 / 補-4-12-1, 2, 4）。
 * 選手一覧・選手詳細・お気に入り一覧のどの画面に置いても `useFavoritePlayers` の
 * queryKey が共通のため、登録/解除は即時に全画面へ同期される。
 * ADR-006: 上限10名。上限到達時はアラートで案内する（LikeButton と同じ「自己完結ボタン」パターン）。
 */
import React from 'react'
import { Alert, Pressable, StyleSheet } from 'react-native'

import { Txt } from '../../components/ui'
import { alertMutationError } from '../../lib/mutationFeedback'
import { MAX_FAVORITES, useFavoritePlayers, useToggleFavoritePlayer } from '../../queries/home'
import { colors } from '../../theme'

export const FavoriteStarButton = ({
  playerId,
  size = 'md',
}: {
  playerId: number
  size?: 'sm' | 'md' | 'lg'
}) => {
  const { playerIds, favoriteIdByPlayerId } = useFavoritePlayers()
  const toggle = useToggleFavoritePlayer()
  const favoriteId = favoriteIdByPlayerId.get(playerId)
  const isFavorite = Boolean(favoriteId)

  const onPress = () => {
    if (!isFavorite && playerIds.length >= MAX_FAVORITES) {
      Alert.alert(
        'お気に入りは10名までです',
        `お気に入り選手は${MAX_FAVORITES}名まで登録できます。解除してから追加してください。`,
      )
      return
    }
    toggle.mutate(
      { playerId, favoriteId, currentCount: playerIds.length, nextOrder: playerIds.length },
      { onError: (e) => alertMutationError(e) },
    )
  }

  const fontSize = size === 'sm' ? 'md' : size === 'lg' ? 'xxl' : 'lg'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'お気に入りを解除' : 'お気に入りに登録'}
      accessibilityState={{ selected: isFavorite }}
      disabled={toggle.isPending}
      onPress={onPress}
      hitSlop={10}
      style={styles.btn}
    >
      <Txt size={fontSize} color={isFavorite ? colors.accent : colors.borderStrong}>
        {isFavorite ? '★' : '☆'}
      </Txt>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', padding: 4 },
})
