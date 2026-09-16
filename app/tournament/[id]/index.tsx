/**
 * 大会詳細 概要タブ `/tournament/[id]`（T-07-2 / 要求 1-8, 1-13, 1-26, 5-1）。
 * 補-1-8-1: 概要タブに 会場/日程/賞金総額/パンフレット/ストア/チケット の各導線を配置する。
 */
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { Linking, ScrollView, StyleSheet, View } from 'react-native'

import { Button, Card, ErrorView, Loading, StatusBadge, Txt } from '../../../src/components/ui'
import { useLoginGate } from '../../../src/features/auth'
import { relDoc } from '../../../src/features/common'
import { TournamentTabs } from '../../../src/features/tournaments'
import { formatDateRange, formatMoney } from '../../../src/lib/format'
import { useTicketTypes } from '../../../src/queries/tickets'
import { useTournament } from '../../../src/queries/tournaments'
import { colors, space } from '../../../src/theme'
import type { Venue } from '../../../src/types/payload'

export default function TournamentOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: tournament, isLoading, error, refetch } = useTournament(id)
  const { data: ticketTypesData } = useTicketTypes(id)
  const requireAuth = useLoginGate()

  const venue = tournament ? relDoc<Venue>(tournament.venue) : undefined
  const hasPamphlet = Boolean(tournament?.pamphletPdf || tournament?.pamphletWebUrl)
  const hasTickets = (ticketTypesData?.docs?.length ?? 0) > 0

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: tournament?.name ?? '大会詳細' }} />
      <TournamentTabs tournamentId={id} active="overview" />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : !tournament ? (
        <ErrorView error={new Error('大会が見つかりませんでした')} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headRow}>
            <Txt size="xxl" weight="bold" style={{ flex: 1 }}>
              {tournament.name}
            </Txt>
            <StatusBadge status={tournament.status} />
          </View>

          <Card style={{ gap: space.sm }}>
            <Row label="会場" value={venue?.name ?? '-'} />
            <Row label="日程" value={formatDateRange(tournament.startDate, tournament.endDate)} />
            <Row label="賞金総額" value={formatMoney(tournament.prizeMoneyTotal)} />
          </Card>

          <Card style={{ gap: space.md }}>
            <Txt weight="bold">パンフレット・組み合わせ</Txt>
            <Button
              title="組み合わせを見る"
              variant="ghost"
              onPress={() => router.push(`/tournament/${id}/pairings`)}
            />
            {hasPamphlet ? (
              <Button
                title="デジタルパンフレットを見る"
                variant="ghost"
                onPress={() => router.push(`/tournament/${id}/brochure`)}
              />
            ) : null}
          </Card>

          {tournament.officialStoreUrl ? (
            <Card style={{ gap: space.md }}>
              <Txt weight="bold">公式ストア</Txt>
              <Txt size="sm" color={colors.textSub}>
                大会オフィシャルグッズは外部ストアでご購入いただけます。
              </Txt>
              <Button
                title="公式ストアを見る"
                variant="secondary"
                onPress={() => void Linking.openURL(tournament.officialStoreUrl as string)}
              />
            </Card>
          ) : null}

          {hasTickets ? (
            <Card style={{ gap: space.md }}>
              <Txt weight="bold">チケット</Txt>
              <Txt size="sm" color={colors.textSub}>
                観戦チケットの券種を確認して購入できます（決済はテスト実装です）。
              </Txt>
              <Button
                title="チケットを購入する"
                onPress={() => {
                  if (!requireAuth('チケット購入にはログインが必要です')) return
                  router.push(`/tournament/${id}/tickets`)
                }}
              />
            </Card>
          ) : null}
        </ScrollView>
      )}
    </View>
  )
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    <Txt color={colors.textSub}>{label}</Txt>
    <Txt weight="medium">{value}</Txt>
  </View>
)

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
})
