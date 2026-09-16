/**
 * 開催中/直近大会カード（04-screen-spec.md 2章「ホーム」4項 / 要求 3-1）。
 * 順位トップ3 + リーダーボード導線。大会データが無い場合はカードごと非表示にする
 * （オフシーズン等でホーム全体が壊れないようにする）。
 */
import { router } from 'expo-router'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Button, Card, Skeleton, StatusBadge, Txt } from '../../components/ui'
import { relDoc } from '../common'
import { formatDateRange, formatPosition, formatToPar, toParColor } from '../../lib/format'
import {
  HOME_TOP_N,
  useHomeTournament,
  useLatestRound,
  useTopScores,
} from '../../queries/home'
import { colors, space } from '../../theme'
import type { Player } from '../../types/payload'

export const TournamentCard = () => {
  const { tournament, isLoading } = useHomeTournament()
  const { round } = useLatestRound(tournament ? String(tournament.id) : undefined)
  const { data: scoresData } = useTopScores(round?.id, HOME_TOP_N)
  const scores = scoresData?.docs ?? []

  if (isLoading) return <Skeleton height={160} style={styles.skeleton} />
  if (!tournament) return null

  return (
    <Card onPress={() => router.push(`/tournament/${tournament.id}`)} style={styles.card}>
      <View style={styles.headRow}>
        <Txt weight="bold" size="lg" style={{ flex: 1 }} numberOfLines={1}>
          {tournament.name}
        </Txt>
        <StatusBadge status={tournament.status} />
      </View>
      <Txt size="sm" color={colors.textSub}>
        {formatDateRange(tournament.startDate, tournament.endDate)}
      </Txt>

      {scores.length > 0 ? (
        <View style={styles.scores}>
          {scores.map((s) => {
            const player = relDoc<Player>(s.player)
            return (
              <View key={s.id} style={styles.scoreRow}>
                <Txt weight="bold" size="sm" style={styles.pos}>
                  {formatPosition(s.position, s.positionTied, s.status)}
                </Txt>
                <Txt size="sm" style={{ flex: 1 }} numberOfLines={1}>
                  {player?.name ?? '-'}
                </Txt>
                <Txt weight="bold" size="sm" color={toParColor(s.toPar)}>
                  {formatToPar(s.toPar)}
                </Txt>
              </View>
            )
          })}
        </View>
      ) : null}

      <Button
        title="リーダーボードを見る"
        variant="ghost"
        onPress={() => router.push(`/tournament/${tournament.id}/leaderboard`)}
        style={{ marginTop: space.md }}
      />
    </Card>
  )
}

const styles = StyleSheet.create({
  skeleton: { margin: space.lg, borderRadius: 10 },
  card: { margin: space.lg },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  scores: { marginTop: space.md, gap: space.sm },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pos: { minWidth: 32 },
})
