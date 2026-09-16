/**
 * 選手比較 `/tournament/[id]/compare`（T-10-6 / 要求 3-7 / 補-3-7-1, 補-3-7-2, ADR-007）。
 * 最大4名。(a) スコア推移折れ線 / (b) スタッツのレーダーチャート / (c) Hole-by-Hole 並列表 の3タブ。
 */
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { EmptyState, ErrorView, Loading, Tabs, Txt } from '../../../src/components/ui'
import {
  CompareHoleTable,
  CompareRadarChart,
  CompareScoreChart,
} from '../../../src/features/leaderboard'
import { aggregateStats, useCompareScores } from '../../../src/queries/leaderboard'
import { pickDefaultRound, useTournament, useTournamentRounds } from '../../../src/queries/tournaments'
import { comparePlayerIdsAtom, leaderboardRoundAtom, MAX_COMPARE_PLAYERS } from '../../../src/store'
import { colors, playerColorAt, space } from '../../../src/theme'

type CompareTab = 'trend' | 'radar' | 'holes'

export default function CompareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { ids: idsParam, round: roundParam } = useLocalSearchParams<{ ids?: string; round?: string }>()

  const { data: tournament } = useTournament(id)
  const { data: roundsData, isLoading: rLoading } = useTournamentRounds(id)
  const rounds = useMemo(() => [...(roundsData?.docs ?? [])].sort((a, b) => a.number - b.number), [roundsData])

  const [compareIds, setCompareIds] = useAtom(comparePlayerIdsAtom)
  useEffect(() => {
    if (compareIds.length === 0 && idsParam) {
      setCompareIds(idsParam.split(',').filter(Boolean).slice(0, MAX_COMPARE_PLAYERS))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [roundId, setRoundId] = useAtom(leaderboardRoundAtom(id))
  useEffect(() => {
    if (roundId !== undefined) return
    if (roundParam) setRoundId(Number(roundParam))
    else if (rounds.length) setRoundId(pickDefaultRound(rounds)?.id)
  }, [roundId, roundParam, rounds, setRoundId])

  const playerIds = useMemo(() => compareIds.map(Number), [compareIds])
  const { entries, isLoading: cLoading, error, refetch } = useCompareScores(id, playerIds)

  const orderedPlayers = useMemo(
    () =>
      playerIds
        .map((pid) => entries.find((e) => e.player.id === pid))
        .filter((e): e is NonNullable<typeof e> => Boolean(e)),
    [playerIds, entries],
  )

  const roundNumber = rounds.find((r) => r.id === roundId)?.number
  const roundScorePlayers = useMemo(
    () =>
      orderedPlayers.map((e) => ({
        player: e.player,
        score: roundNumber !== undefined ? e.byRoundNumber[roundNumber] : undefined,
      })),
    [orderedPlayers, roundNumber],
  )
  const statsPlayers = useMemo(
    () =>
      orderedPlayers.map((e) => ({
        player: e.player,
        stats: aggregateStats(Object.values(e.byRoundNumber)),
      })),
    [orderedPlayers],
  )

  const [tab, setTab] = useState<CompareTab>('trend')

  const removePlayer = (playerId: number) => {
    setCompareIds((cur) => cur.filter((v) => v !== String(playerId)))
  }

  const isLoading = rLoading || cLoading

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: `選手比較${tournament ? ` - ${tournament.name}` : ''}` }} />

      {compareIds.length === 0 ? (
        <EmptyState
          icon="⚖️"
          title="比較する選手が選択されていません"
          description="リーダーボードから「選手比較」で最大4名まで選択してください。"
          actionLabel="リーダーボードへ戻る"
          onAction={() => router.replace(`/tournament/${id}/leaderboard`)}
        />
      ) : isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <View style={styles.chipRow}>
            {orderedPlayers.map((e, i) => (
              <View key={e.player.id} style={styles.chip}>
                <View style={[styles.dot, { backgroundColor: playerColorAt(i) }]} />
                <Txt size="sm" weight="bold">
                  {e.player.name}
                </Txt>
                <Pressable onPress={() => removePlayer(e.player.id)} hitSlop={8}>
                  <Txt size="sm" color={colors.textMuted}>
                    ×
                  </Txt>
                </Pressable>
              </View>
            ))}
          </View>

          {rounds.length > 0 ? (
            <Tabs
              scrollable
              value={String(roundId ?? '')}
              onChange={(v) => setRoundId(Number(v))}
              options={rounds.map((r) => ({ value: String(r.id), label: `R${r.number}` }))}
            />
          ) : null}

          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'trend', label: 'スコア推移' },
              { value: 'radar', label: 'スタッツ' },
              { value: 'holes', label: 'Hole-by-Hole' },
            ]}
          />

          <ScrollView contentContainerStyle={styles.content}>
            {tab === 'trend' ? (
              <CompareScoreChart players={roundScorePlayers} />
            ) : tab === 'radar' ? (
              <CompareRadarChart players={statsPlayers} />
            ) : (
              <CompareHoleTable players={roundScorePlayers} />
            )}
          </ScrollView>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, padding: space.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgSubtle,
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 999 },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.lg },
})
