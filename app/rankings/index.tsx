/**
 * 年間ランキング `/rankings`（T-07-5, T-07-6 / 要求 1-4, 1-5, 1-6, 1-7）。
 * 補-1-5-1: 賞金は「年間」「直近大会」の2タブ。
 * 補-1-6-1 / ADR-014: ポイントは CMS 入力値をそのまま表示（算式は持たない）。
 * 補-1-7-1: 新人王 + 部門別5種（セレクタ切替）。
 * 受け入れ基準: 賞金/ポイント/新人王/部門別の4系統すべてがセレクタから到達できる。
 */
import { router, Stack } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useEffect, useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'

import { EmptyState, ErrorView, Loading, Tabs, Txt } from '../../src/components/ui'
import { RankingRow } from '../../src/features/ranking'
import { formatMoneyShort } from '../../src/lib/format'
import {
  RANKING_CATEGORIES,
  RANKING_TYPE_LABELS,
  STAT_CATEGORY_TYPES,
  useLatestRanking,
  useRecentMoneyRanking,
  type RankingCategory,
  type RankingType,
} from '../../src/queries/rankings'
import { useCurrentSeason, useSeasons } from '../../src/queries/tournaments'
import { selectedSeasonAtom } from '../../src/store/ui'
import { colors, space } from '../../src/theme'

type MoneyTab = 'season' | 'recent'

export default function RankingsScreen() {
  const [selectedSeasonId, setSelectedSeasonId] = useAtom(selectedSeasonAtom)
  const { data: seasonsData } = useSeasons()
  const { season: defaultSeason } = useCurrentSeason()
  const seasons = seasonsData?.docs ?? []

  useEffect(() => {
    if (!selectedSeasonId && defaultSeason) setSelectedSeasonId(String(defaultSeason.id))
  }, [selectedSeasonId, defaultSeason, setSelectedSeasonId])

  const [category, setCategory] = useState<RankingCategory>('money')
  const [moneyTab, setMoneyTab] = useState<MoneyTab>('season')
  const [statType, setStatType] = useState<RankingType>(STAT_CATEGORY_TYPES[0])

  const activeType: RankingType = category === 'stats' ? statType : category
  const showSeasonMoney = category === 'money' && moneyTab === 'season'

  const seasonRanking = useLatestRanking(
    selectedSeasonId ?? undefined,
    category === 'money' ? 'money' : activeType,
  )
  const recentMoney = useRecentMoneyRanking(category === 'money' ? selectedSeasonId ?? undefined : undefined)

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: '年間ランキング' }} />

      {seasons.length > 0 ? (
        <Tabs
          scrollable
          value={selectedSeasonId ?? ''}
          options={seasons.map((s) => ({ value: String(s.id), label: s.name }))}
          onChange={setSelectedSeasonId}
        />
      ) : null}

      <Tabs
        value={category}
        options={RANKING_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
        onChange={setCategory}
      />

      {category === 'money' ? (
        <Tabs
          value={moneyTab}
          options={[
            { value: 'season', label: '年間' },
            { value: 'recent', label: '直近大会' },
          ]}
          onChange={setMoneyTab}
        />
      ) : null}

      {category === 'stats' ? (
        <Tabs
          scrollable
          value={statType}
          options={STAT_CATEGORY_TYPES.map((t) => ({ value: t, label: RANKING_TYPE_LABELS[t] }))}
          onChange={setStatType}
        />
      ) : null}

      {category === 'points' ? (
        <Txt size="xs" color={colors.textMuted} style={styles.note}>
          ポイントは大会ごとの獲得ポイントを集計した CMS 入力値をそのまま表示しています（ADR-014）。
        </Txt>
      ) : null}

      {showSeasonMoney || category !== 'money' ? (
        seasonRanking.isLoading ? (
          <Loading />
        ) : seasonRanking.error ? (
          <ErrorView error={seasonRanking.error} onRetry={() => void seasonRanking.refetch()} />
        ) : seasonRanking.entries.length === 0 ? (
          <EmptyState icon="🏅" title="ランキングデータがまだありません" />
        ) : (
          <FlatList
            data={seasonRanking.entries}
            keyExtractor={(item) => item.id ?? `${item.rank}`}
            renderItem={({ item }) => (
              <RankingRow
                entry={item}
                valueLabel={item.valueLabel ?? String(item.value)}
                onPress={() => {
                  const pid = typeof item.player === 'number' ? item.player : item.player.id
                  router.push(`/player/${pid}`)
                }}
              />
            )}
            contentContainerStyle={styles.list}
          />
        )
      ) : recentMoney.isLoading ? (
        <Loading />
      ) : recentMoney.error ? (
        <ErrorView error={recentMoney.error} onRetry={() => void recentMoney.refetch()} />
      ) : !recentMoney.hasComparison || recentMoney.entries.length === 0 ? (
        <EmptyState
          icon="🏅"
          title="直近大会の獲得賞金データがまだありません"
          description="集計スナップショットが2回分たまると表示されます。"
        />
      ) : (
        <FlatList
          data={recentMoney.entries}
          keyExtractor={(item, index) => item.id ?? `${item.rank}-${index}`}
          renderItem={({ item }) => (
            <RankingRow
              entry={{ rank: item.rank, player: item.player, previousRank: null, events: item.events }}
              valueLabel={formatMoneyShort(item.deltaValue)}
              onPress={() => {
                const pid = typeof item.player === 'number' ? item.player : item.player.id
                router.push(`/player/${pid}`)
              }}
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
  list: { padding: space.lg, gap: space.sm, paddingBottom: space.xxl },
  note: { paddingHorizontal: space.lg, paddingTop: space.sm },
})
