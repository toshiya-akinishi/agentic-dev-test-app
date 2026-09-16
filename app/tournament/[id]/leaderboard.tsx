/**
 * リーダーボード `/tournament/[id]/leaderboard`（T-10-1, T-10-2, T-10-3, T-10-4, T-10-7 / 要求 3-1, 3-2, 3-3, 3-6, 3-7）。
 * EP-07 が「準備中」にしていたリーダーボードタブを実装で置き換える。
 *
 * 補-3-1-2: 大会 status=live の間 15 秒ポーリング（バックグラウンド復帰時は即時再取得、useLiveQuery 内蔵）。
 * 補-3-1-1: カットライン区切り線 + CUT ±n ラベル。行タップで Hole-by-Hole 展開（3-2）。
 * 下部タブで 速報(Play-by-play) に切替（04-screen-spec.md 2章）。
 */
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Button, EmptyState, ErrorView, Loading, Tabs, Txt } from '../../../src/components/ui'
import {
  LeaderboardFilterBar,
  LeaderboardTable,
  PlayByPlayFeed,
} from '../../../src/features/leaderboard'
import { TournamentTabs } from '../../../src/features/tournaments'
import { useFavoritePlayers } from '../../../src/queries/home'
import {
  buildLeaderboardEntries,
  computeCutLine,
  filterEntries,
  useTournamentScores,
} from '../../../src/queries/leaderboard'
import {
  pickDefaultRound,
  usePairings,
  useTournament,
  useTournamentRounds,
} from '../../../src/queries/tournaments'
import {
  comparePlayerIdsAtom,
  leaderboardFilterAtom,
  leaderboardGroupAtom,
  leaderboardRoundAtom,
  leaderboardSearchAtom,
  leaderboardViewAtom,
  MAX_COMPARE_PLAYERS,
} from '../../../src/store'
import { colors, space } from '../../../src/theme'

export default function LeaderboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: tournament, isLoading: tLoading, error: tError, refetch: refetchTournament } =
    useTournament(id)
  const { data: roundsData, isLoading: rLoading } = useTournamentRounds(id)
  const rounds = useMemo(() => [...(roundsData?.docs ?? [])].sort((a, b) => a.number - b.number), [roundsData])

  const [roundId, setRoundId] = useAtom(leaderboardRoundAtom(id))
  useEffect(() => {
    if (roundId === undefined && rounds.length) setRoundId(pickDefaultRound(rounds)?.id)
  }, [roundId, rounds, setRoundId])

  const [view, setView] = useAtom(leaderboardViewAtom(id))
  const [filter, setFilter] = useAtom(leaderboardFilterAtom(id))
  const [search, setSearch] = useAtom(leaderboardSearchAtom(id))
  const [groupNo, setGroupNo] = useAtom(leaderboardGroupAtom(id))
  const [compareMode, setCompareMode] = useState(false)
  const [compareIds, setCompareIds] = useAtom(comparePlayerIdsAtom)

  const live = tournament?.status === 'live'
  const roundIds = useMemo(() => rounds.map((r) => r.id), [rounds])
  const { data: scoresData, isLoading: sLoading, error: sError, refetch: refetchScores } =
    useTournamentScores(id, roundIds, live)

  const { playerIds: favoritePlayerIds } = useFavoritePlayers()
  const favoriteSet = useMemo(() => new Set(favoritePlayerIds), [favoritePlayerIds])

  const { data: pairingsData } = usePairings(roundId)
  const pairings = pairingsData?.docs ?? []
  const selectedPairing = pairings.find((p) => p.groupNo === groupNo) ?? pairings[0]

  const allEntries = useMemo(
    () => buildLeaderboardEntries(scoresData?.docs ?? [], rounds),
    [scoresData, rounds],
  )
  const cutLine = useMemo(() => computeCutLine(allEntries), [allEntries])
  const visibleEntries = useMemo(
    () =>
      filterEntries(allEntries, {
        filter,
        favoritePlayerIds: favoriteSet,
        group: filter === 'group' ? selectedPairing : undefined,
        search,
      }),
    [allEntries, filter, favoriteSet, selectedPairing, search],
  )

  const selectedIds = useMemo(() => new Set(compareIds.map(Number)), [compareIds])
  const toggleSelect = (playerId: number) => {
    setCompareIds((cur) => {
      const has = cur.includes(String(playerId))
      if (has) return cur.filter((v) => v !== String(playerId))
      if (cur.length >= MAX_COMPARE_PLAYERS) return cur
      return [...cur, String(playerId)]
    })
  }
  const fillFavorites = () => {
    const ids = allEntries
      .filter((e) => favoriteSet.has(e.player.id))
      .slice(0, MAX_COMPARE_PLAYERS)
      .map((e) => String(e.player.id))
    setCompareIds(ids)
  }

  const isLoading = tLoading || rLoading || sLoading
  const error = tError || sError

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: tournament?.name ? `${tournament.name} リーダーボード` : 'リーダーボード',
          headerRight: () => (
            <Pressable onPress={() => router.push('/tournament/search')} hitSlop={8}>
              <Txt size="sm" color={colors.primary}>
                過去大会検索
              </Txt>
            </Pressable>
          ),
        }}
      />
      <TournamentTabs tournamentId={id} active="leaderboard" />

      {isLoading && !tournament ? (
        <Loading />
      ) : error ? (
        <ErrorView error={error} onRetry={() => { void refetchTournament(); void refetchScores() }} />
      ) : (
        <>
          {live ? (
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Txt size="xs" color={colors.live} weight="bold">
                ライブ更新中（15秒ごと）
              </Txt>
            </View>
          ) : null}

          {rounds.length > 0 ? (
            <Tabs
              scrollable
              value={String(roundId ?? '')}
              onChange={(v) => setRoundId(Number(v))}
              options={rounds.map((r) => ({ value: String(r.id), label: `R${r.number}` }))}
            />
          ) : null}

          <LeaderboardFilterBar
            filter={filter}
            onFilterChange={setFilter}
            pairings={pairings}
            selectedGroupNo={groupNo}
            onSelectGroup={setGroupNo}
            search={search}
            onSearchChange={setSearch}
            compareMode={compareMode}
            onToggleCompareMode={() => setCompareMode((v) => !v)}
            compareCount={compareIds.length}
            onFillFavorites={fillFavorites}
          />

          <View style={{ flex: 1 }}>
            {view === 'board' && !isLoading && visibleEntries.length === 0 ? (
              <EmptyState
                icon="📋"
                title={
                  filter === 'favorites'
                    ? 'お気に入り選手がこの大会に出場していません'
                    : search
                      ? '該当する選手が見つかりません'
                      : 'スコアはまだ登録されていません'
                }
              />
            ) : view === 'board' ? (
              <LeaderboardTable
                tournamentId={id}
                entries={visibleEntries}
                rounds={rounds}
                cutLine={cutLine}
                compareMode={compareMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                favoritePlayerIds={favoriteSet}
                viewRoundId={roundId}
              />
            ) : (
              <PlayByPlayFeed
                roundId={roundId}
                live={live}
                favoritePlayerIds={favoritePlayerIds}
                players={allEntries.map((e) => e.player)}
              />
            )}
          </View>

          {compareMode && compareIds.length > 0 ? (
            <View style={styles.floatingBar}>
              <Txt color={colors.textInverse} weight="bold" style={{ flex: 1 }}>
                {compareIds.length}名を選択中
              </Txt>
              <Button
                title="比較する"
                onPress={() => router.push(`/tournament/${id}/compare?ids=${compareIds.join(',')}&round=${roundId ?? ''}`)}
              />
            </View>
          ) : null}

          <Tabs
            value={view}
            onChange={setView}
            options={[
              { value: 'board', label: '順位表' },
              { value: 'playbyplay', label: '速報' },
            ]}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
  },
  liveDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: colors.live },
  floatingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.text,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
})
