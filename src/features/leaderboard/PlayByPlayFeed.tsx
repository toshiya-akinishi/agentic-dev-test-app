/**
 * Play-by-play 速報フィード（3-3 / 補-3-3-3, 補-3-3-4）。
 * 既定フィルタ「お気に入り選手のみ」。ライブ中は15秒ポーリングで先頭に追記し、
 * 自動スクロールはせず「新着 n 件」ボタンで明示的に反映する。
 */
import React, { useEffect, useRef, useState } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'

import { EmptyState, ErrorView, SkeletonList, Tabs, Txt } from '../../components/ui'
import { countNewShots, useRoundShots, type PlayByPlayFilter } from '../../queries/playByPlay'
import { colors, space } from '../../theme'
import type { Player, Shot } from '../../types/payload'
import { PlayByPlayItem } from './PlayByPlayItem'

export const PlayByPlayFeed = ({
  roundId,
  live,
  favoritePlayerIds,
  players,
}: {
  roundId: number | undefined
  live: boolean
  favoritePlayerIds: number[]
  players: Player[]
}) => {
  const [filter, setFilter] = useState<PlayByPlayFilter>('favorites')
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | undefined>(undefined)

  const filterIds =
    filter === 'favorites'
      ? favoritePlayerIds
      : filter === 'player' && selectedPlayerId
        ? [selectedPlayerId]
        : undefined

  const { data, isLoading, error, refetch } = useRoundShots(roundId, filterIds, live)
  const latest = data?.docs ?? []

  const [frozenTopId, setFrozenTopId] = useState<number | undefined>(undefined)
  const [visible, setVisible] = useState<Shot[]>([])
  const filterKeyRef = useRef<string>('')

  useEffect(() => {
    const key = `${filter}:${selectedPlayerId ?? ''}:${roundId ?? ''}`
    if (filterKeyRef.current !== key) {
      filterKeyRef.current = key
      setFrozenTopId(undefined)
      setVisible([])
    }
  }, [filter, selectedPlayerId, roundId])

  useEffect(() => {
    if (!latest.length || frozenTopId !== undefined) return
    setFrozenTopId(latest[0].id)
    setVisible(latest)
  }, [latest, frozenTopId])

  const newCount = frozenTopId !== undefined ? countNewShots(latest, frozenTopId) : 0

  const revealNew = () => {
    if (!latest.length) return
    setFrozenTopId(latest[0].id)
    setVisible(latest)
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterRow}>
        <Tabs
          scrollable
          value={filter}
          onChange={(v) => {
            setFilter(v)
            if (v !== 'player') setSelectedPlayerId(undefined)
          }}
          options={[
            { value: 'favorites', label: 'お気に入り選手のみ' },
            { value: 'all', label: '全選手' },
            { value: 'player', label: '選手を指定' },
          ]}
        />
      </View>

      {filter === 'player' ? (
        <View style={styles.playerPickRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={players}
            keyExtractor={(p) => String(p.id)}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedPlayerId(item.id)}
                style={[styles.playerChip, selectedPlayerId === item.id && styles.playerChipActive]}
              >
                <Txt
                  size="xs"
                  weight="bold"
                  color={selectedPlayerId === item.id ? colors.textInverse : colors.textSub}
                >
                  {item.name}
                </Txt>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ width: space.xs }} />}
            contentContainerStyle={{ paddingHorizontal: space.lg }}
          />
        </View>
      ) : null}

      {newCount > 0 ? (
        <Pressable onPress={revealNew} style={styles.newBanner}>
          <Txt weight="bold" color={colors.textInverse}>
            新着 {newCount}件を表示
          </Txt>
        </Pressable>
      ) : null}

      {isLoading && !visible.length ? (
        <SkeletonList rows={5} />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : filter === 'player' && !selectedPlayerId ? (
        <EmptyState icon="🏌️" title="選手を選択してください" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="📋"
          title="速報がありません"
          description={filter === 'favorites' ? 'お気に入り選手のショットが記録されるとここに表示されます。' : undefined}
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(s) => String(s.id)}
          renderItem={({ item }) => <PlayByPlayItem shot={item} />}
          contentContainerStyle={{ paddingBottom: space.xxl }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  filterRow: { paddingTop: space.sm },
  playerPickRow: { paddingVertical: space.xs },
  playerChip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.bgSubtle,
  },
  playerChipActive: { backgroundColor: colors.primary },
  newBanner: {
    marginHorizontal: space.lg,
    marginVertical: space.sm,
    paddingVertical: space.sm,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
})
