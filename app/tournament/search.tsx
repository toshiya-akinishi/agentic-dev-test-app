/**
 * 過去大会検索 `/tournament/search`（T-10-9 / 要求 3-9 / 補-3-9-1〜3）。
 * 検索軸: シーズン / 大会名 / 選手。大会を選ぶと同一のリーダーボード UI（/tournament/[id]/leaderboard）に到達する。
 * finished 大会ではポーリングが自動的に止まる（useLiveQuery の live=false）。
 */
import { router, Stack } from 'expo-router'
import React, { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'

import { Card, EmptyState, Loading, StatusBadge, Tabs, TextField, Txt } from '../../src/components/ui'
import { normalizeForSearch } from '../../src/features/guide/search'
import { formatDateRange } from '../../src/lib/format'
import { usePlayerSearch, usePlayerTournamentHistory } from '../../src/queries/leaderboard'
import { useSeasons, useTournaments } from '../../src/queries/tournaments'
import { colors, space } from '../../src/theme'
import type { Player, Tournament } from '../../src/types/payload'

const TournamentRow = ({ tournament }: { tournament: Tournament }) => (
  <Card onPress={() => router.push(`/tournament/${tournament.id}/leaderboard`)} style={{ gap: space.xs }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Txt weight="bold" style={{ flex: 1 }} numberOfLines={1}>
        {tournament.name}
      </Txt>
      <StatusBadge status={tournament.status} />
    </View>
    <Txt size="sm" color={colors.textSub}>
      {formatDateRange(tournament.startDate, tournament.endDate)}
    </Txt>
  </Card>
)

const ByTournamentSearch = () => {
  const { data: seasonsData } = useSeasons()
  const seasons = seasonsData?.docs ?? []
  const [seasonId, setSeasonId] = useState<string | undefined>(undefined)
  const activeSeasonId = seasonId ?? (seasons[0] ? String(seasons[0].id) : undefined)
  const { tournaments, isLoading } = useTournaments(activeSeasonId)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query)
    if (!q) return tournaments
    return tournaments.filter((t) => normalizeForSearch(t.name).includes(q))
  }, [tournaments, query])

  return (
    <View style={{ flex: 1 }}>
      {seasons.length > 0 ? (
        <Tabs
          scrollable
          value={activeSeasonId ?? ''}
          onChange={setSeasonId}
          options={seasons.map((s) => ({ value: String(s.id), label: s.name }))}
        />
      ) : null}
      <View style={{ paddingHorizontal: space.lg, paddingVertical: space.sm }}>
        <TextField placeholder="大会名で検索" value={query} onChangeText={setQuery} />
      </View>
      {isLoading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🏆" title="該当する大会が見つかりません" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => String(t.id)}
          renderItem={({ item }) => <TournamentRow tournament={item} />}
          ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
          contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
        />
      )}
    </View>
  )
}

const PlayerRow = ({ player, selected, onPress }: { player: Player; selected: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={[styles.playerRow, selected && { backgroundColor: colors.bgSubtle }]}>
    <Txt weight={selected ? 'bold' : 'regular'}>{player.name}</Txt>
    {player.nameEn ? (
      <Txt size="xs" color={colors.textMuted}>
        {player.nameEn}
      </Txt>
    ) : null}
  </Pressable>
)

const ByPlayerSearch = () => {
  const [query, setQuery] = useState('')
  const [playerId, setPlayerId] = useState<number | undefined>(undefined)
  const { data: playersData, isLoading: searching } = usePlayerSearch(query)
  const players = playersData?.docs ?? []
  const { tournaments, isLoading: historyLoading } = usePlayerTournamentHistory(playerId)

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: space.lg, paddingVertical: space.sm }}>
        <TextField
          placeholder="選手名で検索"
          value={query}
          onChangeText={(v) => {
            setQuery(v)
            setPlayerId(undefined)
          }}
        />
      </View>

      {!query ? (
        <EmptyState icon="🏌️" title="選手名を入力してください" description="出場大会の履歴から検索します。" />
      ) : searching ? (
        <Loading />
      ) : players.length === 0 ? (
        <EmptyState icon="🔍" title="該当する選手が見つかりません" />
      ) : !playerId ? (
        <FlatList
          data={players}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => (
            <PlayerRow player={item} selected={false} onPress={() => setPlayerId(item.id)} />
          )}
        />
      ) : historyLoading ? (
        <Loading />
      ) : tournaments.length === 0 ? (
        <EmptyState icon="🏆" title="出場大会の記録が見つかりません" />
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={(t) => String(t.id)}
          renderItem={({ item }) => <TournamentRow tournament={item} />}
          ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
          contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
          ListHeaderComponent={
            <Pressable onPress={() => setPlayerId(undefined)} style={{ paddingBottom: space.md }}>
              <Txt size="sm" color={colors.primary}>
                ← 選手選択に戻る
              </Txt>
            </Pressable>
          }
        />
      )}
    </View>
  )
}

export default function TournamentSearchScreen() {
  const [tab, setTab] = useState<'tournament' | 'player'>('tournament')

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: '過去大会・選手検索' }} />
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'tournament', label: '大会・シーズンから探す' },
          { value: 'player', label: '選手から探す' },
        ]}
      />
      {tab === 'tournament' ? <ByTournamentSearch /> : <ByPlayerSearch />}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  playerRow: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
})
