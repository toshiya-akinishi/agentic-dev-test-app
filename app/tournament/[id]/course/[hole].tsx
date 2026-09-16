/**
 * ホール詳細 `/tournament/[id]/course/[hole]`（T-08-9, T-08-10 / 要求 1-19, 1-20 / 補-1-19-2, 補-1-20-1, 2）。
 * 距離・パー・攻略ポイント・平均スコア・写真/イラスト切替・ショットビューへの導線。
 */
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React, { useMemo } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { Button, Card, EmptyState, ErrorView, Loading, Txt } from '../../../../src/components/ui'
import { relDoc } from '../../../../src/features/common'
import { HolePhotoToggle } from '../../../../src/features/venue'
import { RichText } from '../../../../src/lib/richtext'
import { useTournamentScores } from '../../../../src/queries/leaderboard'
import { aggregateHolePerformance, useCourseHoles } from '../../../../src/queries/shots'
import { pickDefaultRound, useTournament, useTournamentRounds } from '../../../../src/queries/tournaments'
import { colors, space } from '../../../../src/theme'
import type { Course } from '../../../../src/types/payload'

export default function HoleDetailScreen() {
  const { id, hole: holeParam } = useLocalSearchParams<{ id: string; hole: string }>()
  const holeNumber = Number(holeParam)

  const { data: tournament, isLoading: tournamentLoading, error, refetch } = useTournament(id)
  const course = tournament ? relDoc<Course>(tournament.course) : undefined
  const { holes, isLoading: holesLoading } = useCourseHoles(course?.id)
  const hole = holes.find((h) => h.number === holeNumber)

  const { data: roundsData } = useTournamentRounds(id)
  const rounds = roundsData?.docs ?? []
  const roundIds = useMemo(() => rounds.map((r) => r.id), [rounds])
  const defaultRound = pickDefaultRound(rounds)

  /** 補-1-19-2: 平均スコアは大会内の全ラウンド×全選手の holeScores から集計する（EP-11 の集計方式を再利用） */
  const { data: scoresData } = useTournamentScores(id, roundIds, false)
  const scores = scoresData?.docs ?? []
  const aggregate = useMemo(() => aggregateHolePerformance(scores, holeNumber), [scores, holeNumber])

  const loading = tournamentLoading || holesLoading

  if (loading) return <Loading />
  if (error) return <ErrorView error={error} onRetry={() => void refetch()} />
  if (!hole) return <EmptyState icon="⛳" title="ホール情報が見つかりませんでした" />

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: `${hole.number}H` }} />
      <ScrollView contentContainerStyle={styles.content}>
        <HolePhotoToggle hole={hole} />

        <Card style={{ gap: space.sm }}>
          <Txt weight="bold" size="xl">
            {hole.number}H ・ Par {hole.par}
          </Txt>
          <View style={{ flexDirection: 'row', gap: space.lg }}>
            <Txt size="sm" color={colors.textSub}>
              {hole.yards}Y
            </Txt>
            {typeof hole.handicap === 'number' ? (
              <Txt size="sm" color={colors.textSub}>
                ハンディキャップ {hole.handicap}
              </Txt>
            ) : null}
            <Txt size="sm" color={colors.textSub}>
              平均 {typeof aggregate.avgStrokes === 'number' ? aggregate.avgStrokes.toFixed(2) : '-'} 打
            </Txt>
          </View>
        </Card>

        {hole.description ? (
          <Card style={{ gap: space.sm }}>
            <Txt weight="bold">攻略ポイント</Txt>
            <RichText value={hole.description} />
          </Card>
        ) : null}

        {defaultRound ? (
          <Button
            title="ショットビューで見る"
            variant="ghost"
            onPress={() => router.push(`/shotview/${defaultRound.id}?hole=${hole.number}`)}
          />
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
})
