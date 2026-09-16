/**
 * お気に入り選手一覧の1行（T-13-6 / 補-4-12-3, 補-4-13-1, 2）。
 * 出場中（round.status が live/suspended）なら大会名・順位・Today・Thru をリアルタイム表示、
 * それ以外は直近大会の結果を表示する。上下ボタンで並べ替え（`favorites.order`）。
 *
 * 補-4-13-2「行タップでリーダーボードの当該選手位置へスクロールした状態で遷移する」は、
 * ドラッグ&ドロップ用ライブラリを追加せず既存の `leaderboardSearchAtom` を選手名で
 * 事前セットしてから遷移する簡易実装（フルの scrollToIndex 実装は今後の改善候補）。
 */
import { Image } from 'expo-image'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { mediaUrl } from '../common'
import { formatDate, formatPosition, formatThru, formatToPar, toParColor } from '../../lib/format'
import { colors, radius, space } from '../../theme'
import type { FavoritePlayerStatus } from '../../queries/players'
import type { Player } from '../../types/payload'

export const FavoritePlayerRow = ({
  order,
  player,
  status,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onPress,
  onRemove,
}: {
  order: number
  player: Player
  status?: FavoritePlayerStatus
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onPress: () => void
  onRemove: () => void
}) => {
  const photo = mediaUrl(player.photo, 'thumb')
  const isLive = status ? status.round.status === 'live' || status.round.status === 'suspended' : false

  return (
    <View style={styles.row}>
      <View style={styles.orderCol}>
        <Pressable onPress={onMoveUp} disabled={!canMoveUp} hitSlop={6}>
          <Txt size="sm" color={canMoveUp ? colors.textSub : colors.border}>
            ▲
          </Txt>
        </Pressable>
        <Pressable onPress={onMoveDown} disabled={!canMoveDown} hitSlop={6}>
          <Txt size="sm" color={canMoveDown ? colors.textSub : colors.border}>
            ▼
          </Txt>
        </Pressable>
      </View>

      <Pressable onPress={onPress} style={({ pressed }) => [styles.main, pressed && { opacity: 0.7 }]}>
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
          {status ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              {isLive ? (
                <Txt size="xs" weight="bold" color={colors.live}>
                  出場中
                </Txt>
              ) : (
                <Txt size="xs" color={colors.textMuted}>
                  {formatDate(status.tournament.startDate)}
                </Txt>
              )}
              <Txt size="xs" color={colors.textMuted} numberOfLines={1} style={{ flex: 1 }}>
                {status.tournament.name}
              </Txt>
            </View>
          ) : (
            <Txt size="xs" color={colors.textMuted}>
              出場履歴なし
            </Txt>
          )}
        </View>
        {status ? (
          <View style={styles.scoreCol}>
            <Txt weight="bold" color={toParColor(status.score.toPar)}>
              {formatToPar(status.score.toPar)}
            </Txt>
            <Txt size="xs" color={colors.textSub}>
              {formatPosition(status.score.position, status.score.positionTied, status.score.status)}
            </Txt>
            {isLive ? (
              <Txt size="xs" color={colors.textMuted}>
                Thru {formatThru(status.score.thru, status.score.status)}
              </Txt>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      <Pressable onPress={onRemove} hitSlop={10} accessibilityLabel="お気に入りを解除">
        <Txt size="lg" color={colors.accent}>
          ★
        </Txt>
      </Pressable>
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
  orderCol: { width: 20, alignItems: 'center', gap: 2 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  photo: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primaryLight },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  scoreCol: { alignItems: 'flex-end', minWidth: 56 },
})
