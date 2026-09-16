/**
 * リーダーボード表本体（3-1, 3-2, 3-6, 3-8 / 補-3-1-1, 補-3-2-1, 補-3-2-2, 補-3-8-1a）。
 * カットライン区切り線 + Hole-by-Hole / スタッツの行内展開を持つ。
 */
import { router } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { Button, Tabs, Txt } from '../../components/ui'
import { AdSlot } from '../ads'
import { formatToPar } from '../../lib/format'
import { usePlayerRoundShots } from '../../queries/playByPlay'
import { colors, space } from '../../theme'
import type { CutLineInfo, LeaderboardEntry } from '../../queries/leaderboard'
import type { Round } from '../../types/payload'
import { COL, LeaderboardRow } from './LeaderboardRow'
import { HoleByHoleGrid } from './HoleByHoleGrid'
import { PlayerStatsPanel } from './PlayerStatsPanel'

const HeaderCell = ({ width, label }: { width: number; label: string }) => (
  <View style={{ width, alignItems: 'center' }}>
    <Txt size="xs" weight="bold" color={colors.textSub}>
      {label}
    </Txt>
  </View>
)

const CutLineDivider = ({ cutLine }: { cutLine: CutLineInfo }) => (
  <View style={styles.cutLine}>
    <View style={styles.cutLineBar} />
    <Txt size="xs" weight="bold" color={colors.textInverse} style={styles.cutLineLabel}>
      CUT {formatToPar(cutLine.toPar)}
    </Txt>
    <View style={styles.cutLineBar} />
  </View>
)

/** 展開時の Hole-by-Hole / スタッツパネル。ここでラウンド×選手のショットを引いて動画導線を出す */
const ExpandedPanel = ({
  tournamentId,
  roundId,
  playerId,
  score,
}: {
  tournamentId: string
  roundId: number | undefined
  playerId: number
  score: LeaderboardEntry['latest'] | undefined
}) => {
  const [tab, setTab] = useState<'holes' | 'stats'>('holes')
  const { videoShotByHole } = usePlayerRoundShots(roundId, playerId)

  if (!score) {
    return (
      <View style={styles.expandedPanel}>
        <Txt size="sm" color={colors.textMuted}>
          このラウンドのスコアはまだありません。
        </Txt>
      </View>
    )
  }

  return (
    <View style={styles.expandedPanel}>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'holes', label: 'Hole-by-Hole' },
          { value: 'stats', label: 'スタッツ' },
        ]}
      />
      <View style={{ marginTop: space.sm }}>
        {tab === 'holes' ? (
          <HoleByHoleGrid
            score={score}
            videoShotByHole={videoShotByHole}
            onPressHole={(_hole, shot) => {
              if (shot?.video) {
                const videoId = typeof shot.video === 'number' ? shot.video : shot.video.id
                router.push(`/video/${videoId}`)
              }
            }}
          />
        ) : (
          <PlayerStatsPanel tournamentId={tournamentId} playerId={playerId} roundStats={score.stats} />
        )}
      </View>
      {roundId ? (
        <Button
          title="ショットビューで見る"
          variant="ghost"
          onPress={() => router.push(`/shotview/${roundId}?player=${playerId}`)}
          style={{ marginTop: space.sm }}
        />
      ) : null}
    </View>
  )
}

export const LeaderboardTable = ({
  tournamentId,
  entries,
  rounds,
  cutLine,
  compareMode,
  selectedIds,
  onToggleSelect,
  favoritePlayerIds,
  viewRoundId,
}: {
  tournamentId: string
  entries: LeaderboardEntry[]
  rounds: Round[]
  cutLine?: CutLineInfo
  compareMode: boolean
  selectedIds: Set<number>
  onToggleSelect: (playerId: number) => void
  favoritePlayerIds: Set<number>
  viewRoundId?: number
}) => {
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | undefined>(undefined)

  const sortedRounds = [...rounds].sort((a, b) => a.number - b.number)
  const roundNumbers = sortedRounds.map((r) => r.number)
  const viewRoundNumber = sortedRounds.find((r) => r.id === viewRoundId)?.number
  const expandedEntry = entries.find((e) => e.player.id === expandedPlayerId)

  const tableWidth =
    COL.pos + COL.player + COL.total + COL.today + COL.thru + roundNumbers.length * COL.round + (compareMode ? 28 : 0)

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: space.xxl }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: tableWidth }}>
          <View style={styles.headerRow}>
            {compareMode ? <View style={{ width: 28 }} /> : null}
            <HeaderCell width={COL.pos} label="順位" />
            <HeaderCell width={COL.player} label="選手" />
            <HeaderCell width={COL.total} label="Total" />
            <HeaderCell width={COL.today} label="Today" />
            <HeaderCell width={COL.thru} label="Thru" />
            {roundNumbers.map((n) => (
              <HeaderCell key={n} width={COL.round} label={`R${n}`} />
            ))}
          </View>

          {entries.map((entry, i) => (
            <React.Fragment key={entry.player.id}>
              {cutLine && cutLine.index === i ? <CutLineDivider cutLine={cutLine} /> : null}
              <LeaderboardRow
                entry={entry}
                roundNumbers={roundNumbers}
                expanded={expandedPlayerId === entry.player.id}
                onPress={() =>
                  setExpandedPlayerId((cur) => (cur === entry.player.id ? undefined : entry.player.id))
                }
                compareMode={compareMode}
                checked={selectedIds.has(entry.player.id)}
                onToggleCheck={() => onToggleSelect(entry.player.id)}
                isFavorite={favoritePlayerIds.has(entry.player.id)}
              />
              {/* 補-8-3-1: leaderboard_inline（10行ごと） */}
              {(i + 1) % 10 === 0 && i !== entries.length - 1 ? (
                <View style={{ width: tableWidth }}>
                  <AdSlot slot="leaderboard_inline" tournamentId={tournamentId} />
                </View>
              ) : null}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      {expandedEntry ? (
        <ExpandedPanel
          tournamentId={tournamentId}
          roundId={viewRoundId}
          playerId={expandedEntry.player.id}
          score={viewRoundNumber !== undefined ? expandedEntry.byRoundNumber[viewRoundNumber] : undefined}
        />
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.bgSubtle,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cutLine: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md },
  cutLineBar: { flex: 1, height: 2, backgroundColor: colors.text },
  cutLineLabel: {
    backgroundColor: colors.text,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expandedPanel: {
    padding: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
})
