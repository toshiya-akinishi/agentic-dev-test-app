/**
 * ショットビュー `/shotview/[roundId]`（EP-11 / 要求 1-37〜1-47 / 04-screen-spec.md 2章）。
 *
 * 上部: ラウンド切替（複数ラウンドがある場合）+ ホール別スコアチップ（T-11-8 / 補-1-46-1）。
 * 中央: 2D ホール図（T-11-1, T-11-2）+ 複数選手の色分け弾道重畳（T-11-3）+
 *       ピンチズーム / パン / 向き反転（T-11-5 / 補-1-44-1）+ ヒートマップ（T-11-12 / 補-1-47-1）。
 * 下部: 選手選択チップ（T-11-4 / 補-1-43-1・最大4名 / ADR-007）+ 凡例 + 過去データ分析（T-11-11）。
 * ショットタップ→ボトムシート（T-11-6）で メタデータ / 動画 / AI解説 / Trackman / いいね（T-11-7, T-11-9, T-11-10）。
 */
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { EmptyState, ErrorView, Loading, Tabs, Txt } from '../../src/components/ui'
import { relDoc } from '../../src/features/common'
import {
  HoleAnalysisPanel,
  HoleDiagram,
  HoleScoreChipStrip,
  PlayerLegend,
  PlayerPicker,
  ShotDetailSheet,
  ZoneDetailCard,
  type PlayerShots,
} from '../../src/features/shotview'
import { useFavoritePlayers } from '../../src/queries/home'
import { useTournamentScores } from '../../src/queries/leaderboard'
import {
  aggregateHolePerformance,
  playerHolePerformance,
  useCourseHoles,
  useHoleShots,
  useHoleStatistics,
  usePrimaryPlayerScore,
  useRound,
  useRoundContext,
} from '../../src/queries/shots'
import { useTournamentRounds } from '../../src/queries/tournaments'
import {
  MAX_SHOTVIEW_PLAYERS,
  shotviewHeatmapAtom,
  shotviewHoleAtom,
  shotviewOrientationAtom,
  shotviewPlayerIdsAtom,
} from '../../src/store/ui'
import { colors, playerColorAt, space } from '../../src/theme'
import type { HoleStatistic, Player, Shot } from '../../src/types/payload'

type SelectedShot = { shot: Shot; player: Player; color: string }

export default function ShotViewScreen() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>()
  const { player: playerParam, hole: holeParam } = useLocalSearchParams<{ player?: string; hole?: string }>()

  const { data: round, isLoading: roundLoading, error, refetch } = useRound(roundId)
  const { tournament, course } = useRoundContext(round)
  const tournamentId = tournament?.id
  const courseId = course?.id

  const { data: roundsData } = useTournamentRounds(tournamentId ? String(tournamentId) : undefined)
  const rounds = useMemo(() => [...(roundsData?.docs ?? [])].sort((a, b) => a.number - b.number), [roundsData])

  const { holes } = useCourseHoles(courseId)

  const [hole, setHole] = useAtom(shotviewHoleAtom(roundId ?? ''))
  useEffect(() => {
    if (holeParam) setHole(Number(holeParam))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [playerIds, setPlayerIds] = useAtom(shotviewPlayerIdsAtom)
  useEffect(() => {
    if (playerIds.length === 0 && playerParam) setPlayerIds([playerParam])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { players: favoritePlayers } = useFavoritePlayers()
  const numericPlayerIds = useMemo(
    () => playerIds.map(Number).filter((n) => !Number.isNaN(n)),
    [playerIds],
  )

  const togglePlayer = (playerId: number) => {
    setPlayerIds((cur) => {
      const curNums = cur.map(Number)
      if (curNums.includes(playerId)) return cur.filter((v) => Number(v) !== playerId)
      if (cur.length >= MAX_SHOTVIEW_PLAYERS) return cur
      return [...cur, String(playerId)]
    })
  }

  const { shotsByPlayer } = useHoleShots(round?.id, hole, numericPlayerIds)

  /** 選択順（色分けの並び順）。お気に入りに無い選手が ?player= 経由で来た場合はショットの展開データから名前を補う */
  const orderedPlayers = useMemo<Player[]>(
    () =>
      numericPlayerIds
        .map((pid) => {
          const fav = favoritePlayers.find((p) => p.id === pid)
          if (fav) return fav
          const shots = shotsByPlayer.get(pid)
          return shots && shots.length ? relDoc<Player>(shots[0].player) : undefined
        })
        .filter((p): p is Player => Boolean(p)),
    [numericPlayerIds, favoritePlayers, shotsByPlayer],
  )

  const playersShots = useMemo<PlayerShots[]>(
    () => orderedPlayers.map((p, i) => ({ player: p, color: playerColorAt(i), shots: shotsByPlayer.get(p.id) ?? [] })),
    [orderedPlayers, shotsByPlayer],
  )

  const primaryPlayerId = numericPlayerIds[0]
  const { score: primaryScore } = usePrimaryPlayerScore(round?.id, primaryPlayerId)

  const [heatmapOn, setHeatmapOn] = useAtom(shotviewHeatmapAtom)
  const [orientation, setOrientation] = useAtom(shotviewOrientationAtom)

  const { byZone } = useHoleStatistics(tournamentId, hole)
  const [zoneDetail, setZoneDetail] = useState<HoleStatistic['zone'] | undefined>(undefined)
  const [selectedShot, setSelectedShot] = useState<SelectedShot | undefined>(undefined)

  /* ---------------- 過去データ分析（T-11-11 / 補-1-41-1） ---------------- */
  const roundIds = useMemo(() => rounds.map((r) => r.id), [rounds])
  const { data: tournamentScoresData } = useTournamentScores(
    tournamentId ? String(tournamentId) : undefined,
    roundIds,
    false,
  )
  const tournamentScores = useMemo(() => tournamentScoresData?.docs ?? [], [tournamentScoresData])
  const roundNumberById = useMemo(() => new Map(rounds.map((r) => [r.id, r.number])), [rounds])
  const holeDoc = holes.find((h) => h.number === hole)
  const aggregate = useMemo(() => aggregateHolePerformance(tournamentScores, hole), [tournamentScores, hole])
  const playerHistory = useMemo(
    () => (primaryPlayerId ? playerHolePerformance(tournamentScores, hole, primaryPlayerId) : []),
    [tournamentScores, hole, primaryPlayerId],
  )

  if (roundLoading) return <Loading />
  if (error || !round) return <ErrorView error={error} onRetry={() => void refetch()} />

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: `ショットビュー${tournament ? ` - ${tournament.name}` : ''}` }} />
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
        {rounds.length > 1 ? (
          <Tabs
            scrollable
            value={String(round.id)}
            onChange={(v) => router.replace(`/shotview/${v}`)}
            options={rounds.map((r) => ({ value: String(r.id), label: `R${r.number}` }))}
          />
        ) : null}

        <HoleScoreChipStrip score={primaryScore} selectedHole={hole} onSelectHole={setHole} />

        <View style={styles.diagramWrap}>
          <View style={styles.diagramHeader}>
            <Txt weight="bold">
              {hole}H{holeDoc ? `（Par ${holeDoc.par} / ${holeDoc.yards}Y）` : ''}
            </Txt>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <ToggleButton label="ヒートマップ" active={heatmapOn} onPress={() => setHeatmapOn((v) => !v)} />
              <ToggleButton
                label={orientation === 'tee' ? 'ティー基準' : 'グリーン基準'}
                active={orientation === 'green'}
                onPress={() => setOrientation((v) => (v === 'tee' ? 'green' : 'tee'))}
              />
            </View>
          </View>

          <HoleDiagram
            hole={holeDoc}
            playersShots={playersShots}
            orientation={orientation}
            heatmapOn={heatmapOn}
            byZone={byZone}
            onShotPress={(shot, player, color) => setSelectedShot({ shot, player, color })}
            onZonePress={(zone) => setZoneDetail(zone)}
          />

          {heatmapOn && zoneDetail ? (
            <ZoneDetailCard stat={byZone.get(zoneDetail)} zone={zoneDetail} onClose={() => setZoneDetail(undefined)} />
          ) : null}
        </View>

        <PlayerLegend players={orderedPlayers} />

        <View style={{ marginTop: space.sm }}>
          <Txt size="sm" weight="bold" color={colors.textSub} style={{ paddingHorizontal: space.lg }}>
            比較する選手（お気に入りから最大{MAX_SHOTVIEW_PLAYERS}名）
          </Txt>
          {favoritePlayers.length === 0 ? (
            <View style={{ paddingHorizontal: space.lg, paddingVertical: space.sm }}>
              <EmptyState
                icon="⭐"
                title="お気に入り選手がいません"
                description="選手詳細からお気に入り登録すると、ここで選んでショットを比較できます。"
                actionLabel="選手を探す"
                onAction={() => router.push('/players')}
              />
            </View>
          ) : (
            <PlayerPicker
              favoritePlayers={favoritePlayers}
              selectedIds={numericPlayerIds}
              onToggle={togglePlayer}
              max={MAX_SHOTVIEW_PLAYERS}
            />
          )}
        </View>

        <View style={{ paddingHorizontal: space.lg, marginTop: space.lg }}>
          <HoleAnalysisPanel
            hole={hole}
            par={holeDoc?.par}
            aggregate={aggregate}
            playerName={orderedPlayers[0]?.name}
            playerHistory={playerHistory}
            roundNumberById={roundNumberById}
          />
        </View>
      </ScrollView>

      <ShotDetailSheet
        shot={selectedShot?.shot}
        player={selectedShot?.player}
        color={selectedShot?.color}
        onClose={() => setSelectedShot(undefined)}
      />
    </View>
  )
}

const ToggleButton = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={[styles.toggle, active && styles.toggleActive]}>
    <Txt size="xs" weight="bold" color={active ? colors.textInverse : colors.textSub}>
      {label}
    </Txt>
  </Pressable>
)

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  diagramWrap: { paddingHorizontal: space.lg, marginTop: space.sm },
  diagramHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  toggle: {
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
})
