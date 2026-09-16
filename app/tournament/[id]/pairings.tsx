/**
 * 組み合わせタブ `/tournament/[id]/pairings`（T-07-4 / 要求 1-8）。
 * 補-1-8-2: ラウンド切替・組番号・スタート時刻・スタートホール・選手2〜3名（★でお気に入り表示）。
 * 補-1-8-3: 「お気に入り選手のみ表示」フィルタ。
 */
import { Stack, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import { FlatList, StyleSheet, Switch, View } from 'react-native'

import { EmptyState, ErrorView, Loading, Tabs, Txt } from '../../../src/components/ui'
import { relId } from '../../../src/features/common'
import { PairingGroupCard, TournamentTabs } from '../../../src/features/tournaments'
import { useFavoritePlayers } from '../../../src/queries/home'
import { pickDefaultRound, usePairings, useTournamentRounds } from '../../../src/queries/tournaments'
import { colors, space } from '../../../src/theme'

export default function PairingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: roundsData, isLoading: roundsLoading } = useTournamentRounds(id)
  const rounds = roundsData?.docs ?? []

  const [roundId, setRoundId] = useState<number | undefined>(undefined)
  useEffect(() => {
    if (roundId === undefined && rounds.length) setRoundId(pickDefaultRound(rounds)?.id)
  }, [roundId, rounds])

  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const { playerIds: favoritePlayerIds } = useFavoritePlayers()
  const favoriteSet = useMemo(() => new Set(favoritePlayerIds), [favoritePlayerIds])

  const { data: pairingsData, isLoading: pairingsLoading, error, refetch } = usePairings(roundId)
  const pairings = pairingsData?.docs ?? []

  const filtered = useMemo(
    () =>
      favoritesOnly
        ? pairings.filter((p) =>
            (p.players ?? []).some((pl) => {
              const pid = relId(pl)
              return typeof pid === 'number' && favoriteSet.has(pid)
            }),
          )
        : pairings,
    [pairings, favoritesOnly, favoriteSet],
  )

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: '組み合わせ' }} />
      <TournamentTabs tournamentId={id} active="pairings" />

      {rounds.length > 0 ? (
        <Tabs
          scrollable
          value={String(roundId ?? '')}
          options={rounds.map((r) => ({ value: String(r.id), label: `R${r.number}` }))}
          onChange={(v) => setRoundId(Number(v))}
        />
      ) : null}

      <View style={styles.filterRow}>
        <Txt size="sm" style={{ flex: 1 }}>
          お気に入り選手のみ表示
        </Txt>
        <Switch
          value={favoritesOnly}
          onValueChange={setFavoritesOnly}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
        />
      </View>

      {roundsLoading || pairingsLoading ? (
        <Loading />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="⛳"
          title={favoritesOnly ? 'お気に入り選手の組がありません' : '組み合わせがまだ発表されていません'}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <PairingGroupCard pairing={item} favoritePlayerIds={favoriteSet} />}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  list: { padding: space.lg, paddingBottom: space.xxl },
})
