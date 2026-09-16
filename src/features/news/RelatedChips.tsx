/**
 * ニュース詳細の「関連選手」「関連大会」チップ（補-1-10-2）。
 * 各詳細画面へ遷移できる。選手・大会の詳細画面は別 Epic（EP-07/EP-13）の実装物。
 */
import { router } from 'expo-router'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { relDoc, relId } from '../common'
import { colors, radius, space } from '../../theme'
import type { News, Player, Tournament } from '../../types/payload'

export const RelatedChips = ({ news }: { news: News }) => {
  const tournament = relDoc<Tournament>(news.tournament)
  const players = (news.players ?? [])
    .map((p) => relDoc<Player>(p))
    .filter((p): p is Player => Boolean(p))

  if (!tournament && players.length === 0) return null

  return (
    <View style={styles.wrap}>
      {tournament ? (
        <>
          <Txt weight="bold" size="md">
            関連大会
          </Txt>
          <View style={styles.chips}>
            <Chip
              label={tournament.name}
              onPress={() => router.push(`/tournament/${relId(news.tournament)}`)}
            />
          </View>
        </>
      ) : null}

      {players.length ? (
        <>
          <Txt weight="bold" size="md">
            関連選手
          </Txt>
          <View style={styles.chips}>
            {players.map((p) => (
              <Chip key={p.id} label={p.name} onPress={() => router.push(`/player/${p.id}`)} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  )
}

const Chip = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable
    accessibilityRole="link"
    onPress={onPress}
    style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
  >
    <Txt size="sm" weight="medium" color={colors.primary}>
      {label}
    </Txt>
  </Pressable>
)

const styles = StyleSheet.create({
  wrap: { gap: space.md, marginTop: space.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    backgroundColor: '#E7F1EA',
  },
})
