/**
 * 大会一覧 `/tournaments`（T-07-1 / 要求 1-3, 1-4）。
 * 補-1-3-1: リスト / カレンダーの2ビュー切替（既定リスト）。
 * 補-1-3-2: 行に大会名・会場名・日程・ステータスバッジ・賞金総額。補-5-1-1: チケット販売中バッジ。
 * 補-1-3-3: シーズン切替セレクタ（既定は現行シーズン）。
 * 補-1-4-1: カレンダーは月単位グリッド、1日最大2件+「他n件」。
 */
import { router, Stack } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useEffect, useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { EmptyState, ErrorView, SectionHeader, SkeletonList, Tabs, Txt } from '../../src/components/ui'
import { TournamentCalendar, TournamentListRow } from '../../src/features/tournaments'
import { useCurrentSeason, useSeasons, useTournaments } from '../../src/queries/tournaments'
import { useSaleableTicketTournamentIds } from '../../src/queries/tickets'
import { selectedSeasonAtom, tournamentViewAtom } from '../../src/store/ui'
import { colors, space } from '../../src/theme'
import type { Tournament } from '../../src/types/payload'

export default function TournamentsScreen() {
  const [view, setView] = useAtom(tournamentViewAtom)
  const [selectedSeasonId, setSelectedSeasonId] = useAtom(selectedSeasonAtom)
  const { data: seasonsData } = useSeasons()
  const { season: defaultSeason } = useCurrentSeason()
  const [month, setMonth] = useState(() => new Date())
  const [dayPicker, setDayPicker] = useState<{ date: Date; items: Tournament[] } | null>(null)

  // 補-1-3-3: 既定は現行シーズン。初回のみ自動選択する
  useEffect(() => {
    if (!selectedSeasonId && defaultSeason) setSelectedSeasonId(String(defaultSeason.id))
  }, [selectedSeasonId, defaultSeason, setSelectedSeasonId])

  const seasons = seasonsData?.docs ?? []
  const { tournaments, isLoading, error, refetch } = useTournaments(selectedSeasonId ?? undefined)
  const onSaleIds = useSaleableTicketTournamentIds(tournaments.map((t) => t.id))

  const openDetail = (t: Tournament) => router.push(`/tournament/${t.id}`)

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: '大会' }} />

      <View style={styles.toolbar}>
        {seasons.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {seasons.map((s) => {
                const active = String(s.id) === selectedSeasonId
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setSelectedSeasonId(String(s.id))}
                    style={[styles.seasonChip, active && styles.seasonChipActive]}
                  >
                    <Txt size="sm" weight={active ? 'bold' : 'regular'} color={active ? colors.textInverse : colors.text}>
                      {s.name}
                    </Txt>
                  </Pressable>
                )
              })}
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <Tabs
          value={view}
          options={[
            { value: 'list', label: 'リスト' },
            { value: 'calendar', label: 'カレンダー' },
          ]}
          onChange={setView}
        />
      </View>

      {isLoading ? (
        <SkeletonList rows={6} />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : tournaments.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="このシーズンの大会がありません"
          description="別のシーズンを選択してみてください。"
        />
      ) : view === 'list' ? (
        <FlatList
          data={tournaments}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TournamentListRow
              tournament={item}
              onSaleTicket={onSaleIds.has(item.id)}
              onPress={() => openDetail(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <SectionHeader title="年間ランキング" actionLabel="見る" onAction={() => router.push('/rankings')} />
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <TournamentCalendar
            month={month}
            onChangeMonth={setMonth}
            tournaments={tournaments}
            onSelectDay={(day, dayTournaments) => {
              if (dayTournaments.length === 1) openDetail(dayTournaments[0])
              else setDayPicker({ date: day, items: dayTournaments })
            }}
          />
          {dayPicker ? (
            <View style={{ marginTop: space.lg, gap: space.md }}>
              <Txt weight="bold">
                {dayPicker.date.getMonth() + 1}/{dayPicker.date.getDate()} の大会
              </Txt>
              {dayPicker.items.map((t) => (
                <TournamentListRow
                  key={t.id}
                  tournament={t}
                  onSaleTicket={onSaleIds.has(t.id)}
                  onPress={() => openDetail(t)}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  seasonChip: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: 999,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seasonChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  list: { padding: space.lg, paddingBottom: space.xxl },
})
