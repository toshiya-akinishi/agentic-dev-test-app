/** 組み合わせカード（1-8 / 補-1-8-2, 補-1-8-3） */
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Card, Txt } from '../../components/ui'
import { relDoc } from '../common'
import { formatTime } from '../../lib/format'
import { colors, space } from '../../theme'
import type { Pairing, Player } from '../../types/payload'

export const PairingGroupCard = ({
  pairing,
  favoritePlayerIds,
}: {
  pairing: Pairing
  favoritePlayerIds: Set<number>
}) => {
  const players = (pairing.players ?? [])
    .map((p) => relDoc<Player>(p))
    .filter((p): p is Player => Boolean(p))

  return (
    <Card style={styles.card}>
      <View style={styles.headRow}>
        <Txt weight="bold" size="md">
          第{pairing.groupNo}組
        </Txt>
        <Txt size="sm" color={colors.textSub}>
          {formatTime(pairing.startTime)}スタート ・ {pairing.startHole === 10 ? 'IN(10番)' : 'OUT(1番)'}
        </Txt>
      </View>
      <View style={styles.players}>
        {players.map((p) => (
          <View key={p.id} style={styles.playerRow}>
            {favoritePlayerIds.has(p.id) ? <Txt color={colors.accent}>★</Txt> : null}
            <Txt size="sm">{p.name}</Txt>
          </View>
        ))}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  players: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
})
