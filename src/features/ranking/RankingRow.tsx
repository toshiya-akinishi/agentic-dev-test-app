/** ランキング行（1-5〜1-7 / 補-1-5-3: 順位・前回比・選手名・顔写真・金額/ポイント・出場試合数） */
import { Image } from 'expo-image'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { mediaUrl, relDoc } from '../common'
import { colors, radius, space } from '../../theme'
import type { RankingEntry } from '../../queries/rankings'
import type { Player } from '../../types/payload'

/** 前回比（▲上昇 / ▼下降 / ー変動なし・新規） */
const RankDelta = ({ rank, previousRank }: { rank: number; previousRank?: number | null }) => {
  if (!previousRank) return <Txt size="xs" color={colors.textMuted}>NEW</Txt>
  if (previousRank === rank) return <Txt size="xs" color={colors.textMuted}>ー</Txt>
  if (previousRank > rank)
    return (
      <Txt size="xs" color={colors.under} weight="bold">
        ▲{previousRank - rank}
      </Txt>
    )
  return (
    <Txt size="xs" color={colors.over} weight="bold">
      ▼{rank - previousRank}
    </Txt>
  )
}

export const RankingRow = ({
  entry,
  valueLabel,
  onPress,
}: {
  entry: Pick<RankingEntry, 'rank' | 'player' | 'previousRank' | 'events'>
  /** 表示用の値。money/points/statごとに呼び出し側で整形して渡す */
  valueLabel: string
  onPress?: () => void
}) => {
  const player = relDoc<Player>(entry.player)
  const photo = mediaUrl(player?.photo, 'thumb')

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && { backgroundColor: colors.bgSubtle }]}
    >
      <View style={styles.rankCol}>
        <Txt weight="bold" size="lg">
          {entry.rank}
        </Txt>
        <RankDelta rank={entry.rank} previousRank={entry.previousRank} />
      </View>

      {photo ? (
        <Image source={{ uri: photo }} contentFit="cover" style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoFallback]}>
          <Txt size="sm">⛳</Txt>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Txt weight="bold" numberOfLines={1}>
          {player?.name ?? '-'}
        </Txt>
        {typeof entry.events === 'number' ? (
          <Txt size="xs" color={colors.textMuted}>
            出場 {entry.events}試合
          </Txt>
        ) : null}
      </View>

      <Txt weight="bold" size="md">
        {valueLabel}
      </Txt>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  rankCol: { width: 36, alignItems: 'center' },
  photo: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.bgSubtle },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
})
