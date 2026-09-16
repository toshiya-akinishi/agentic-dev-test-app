/**
 * 選手一覧 `/players`（T-13-1 / 要求 4-7, 4-12）。
 * 検索（和名/英字表記の部分一致）・並び替え（50音順/ランキング順）・お気に入り★登録。
 * EP-04 のスタブをここで実装に置き換える。
 */
import { router, Stack } from 'expo-router'
import React, { useMemo, useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'

import { EmptyState, ErrorView, SkeletonList, Tabs, TextField } from '../../src/components/ui'
import { PlayerListRow } from '../../src/features/players'
import {
  filterPlayers,
  sortPlayersByKana,
  sortPlayersByRanking,
  useActivePlayers,
  usePointsRankIndex,
  type PlayerListSort,
} from '../../src/queries/players'
import { useCurrentSeason } from '../../src/queries/tournaments'
import { colors, space } from '../../src/theme'

export default function PlayersScreen() {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<PlayerListSort>('kana')

  const { data, isLoading, error, refetch } = useActivePlayers()
  const players = data?.docs ?? []

  const { season } = useCurrentSeason()
  const { rankByPlayerId } = usePointsRankIndex(season ? String(season.id) : undefined)

  const filtered = useMemo(() => filterPlayers(players, query), [players, query])
  const sorted = useMemo(
    () => (sort === 'kana' ? sortPlayersByKana(filtered) : sortPlayersByRanking(filtered, rankByPlayerId)),
    [filtered, sort, rankByPlayerId],
  )

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: '選手' }} />

      <View style={styles.toolbar}>
        <TextField
          placeholder="選手名で検索（和名・英字表記）"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
      </View>

      <Tabs
        value={sort}
        onChange={setSort}
        options={[
          { value: 'kana', label: '50音順' },
          { value: 'ranking', label: 'ランキング順' },
        ]}
      />

      {isLoading ? (
        <SkeletonList rows={8} />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="🏌️"
          title={query ? '選手が見つかりません' : '選手情報がありません'}
          description={query ? '検索条件を変えてお試しください。' : undefined}
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => (
            <PlayerListRow
              player={item}
              rank={sort === 'ranking' ? rankByPlayerId.get(item.id) : undefined}
              onPress={() => router.push(`/player/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  toolbar: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  list: { paddingBottom: space.xxl },
})
