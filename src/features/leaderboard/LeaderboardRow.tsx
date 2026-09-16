/**
 * リーダーボード表の1行（3-1 / 補-3-1-1, 補-3-1-4）。
 * 列: 順位(T表記/WD/DQ/CUTバッジ)・選手名・顔写真・Total・Today・Thru・R1〜R4。
 */
import { Image } from 'expo-image'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { mediaUrl } from '../../features/common'
import { formatPosition, formatThru, formatToPar, toParColor } from '../../lib/format'
import { colors, radius, space } from '../../theme'
import type { LeaderboardEntry } from '../../queries/leaderboard'

export const COL = {
  pos: 40,
  player: 150,
  total: 56,
  today: 56,
  thru: 40,
  round: 40,
}

const BadgeStatus = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; color: string }> = {
    cut: { label: 'CUT', color: colors.textMuted },
    wd: { label: 'WD', color: colors.warning },
    dq: { label: 'DQ', color: colors.danger },
  }
  const s = map[status]
  if (!s) return null
  return (
    <Txt size="xs" weight="bold" color={s.color}>
      {s.label}
    </Txt>
  )
}

export const LeaderboardRow = ({
  entry,
  roundNumbers,
  expanded,
  onPress,
  compareMode,
  checked,
  onToggleCheck,
  isFavorite,
}: {
  entry: LeaderboardEntry
  roundNumbers: number[]
  expanded: boolean
  onPress: () => void
  compareMode: boolean
  checked: boolean
  onToggleCheck: () => void
  isFavorite: boolean
}) => {
  const { player, latest, byRoundNumber } = entry
  const photo = mediaUrl(player.photo, 'thumb')
  const isOut = latest.status === 'cut' || latest.status === 'wd' || latest.status === 'dq'

  return (
    <Pressable
      onPress={compareMode ? onToggleCheck : onPress}
      style={({ pressed }) => [
        styles.row,
        expanded && styles.rowExpanded,
        pressed && { backgroundColor: colors.bgSubtle },
      ]}
      accessibilityRole="button"
    >
      {compareMode ? (
        <View style={{ width: 28, alignItems: 'center' }}>
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked ? (
              <Txt color={colors.textInverse} size="xs" weight="bold">
                ✓
              </Txt>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={[styles.cell, { width: COL.pos }]}>
        <Txt weight="bold" color={isOut ? colors.textMuted : colors.text}>
          {formatPosition(latest.position, latest.positionTied, latest.status)}
        </Txt>
      </View>

      <View style={[styles.playerCell, { width: COL.player }]}>
        {photo ? (
          <Image source={{ uri: photo }} contentFit="cover" style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <Txt size="xs">⛳</Txt>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {isFavorite ? (
              <Txt size="xs" color={colors.accent}>
                ★
              </Txt>
            ) : null}
            <Txt weight="medium" numberOfLines={1} style={{ flex: 1 }}>
              {player.name}
            </Txt>
          </View>
          <BadgeStatus status={latest.status} />
        </View>
      </View>

      <View style={[styles.cell, { width: COL.total }]}>
        <Txt weight="bold" color={toParColor(latest.toPar)}>
          {formatToPar(latest.toPar)}
        </Txt>
      </View>

      <View style={[styles.cell, { width: COL.today }]}>
        <Txt size="sm" color={toParColor(latest.today)}>
          {formatToPar(latest.today)}
        </Txt>
      </View>

      <View style={[styles.cell, { width: COL.thru }]}>
        <Txt size="sm" color={colors.textSub}>
          {formatThru(latest.thru, latest.status)}
        </Txt>
      </View>

      {roundNumbers.map((n) => {
        const s = byRoundNumber[n]
        return (
          <View key={n} style={[styles.cell, { width: COL.round }]}>
            <Txt size="sm" color={s ? toParColor(s.today) : colors.textMuted}>
              {s ? formatToPar(s.today) : '-'}
            </Txt>
          </View>
        )
      })}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowExpanded: { backgroundColor: colors.bgSubtle },
  cell: { alignItems: 'center', justifyContent: 'center' },
  playerCell: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  photo: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.bgSubtle },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
})
