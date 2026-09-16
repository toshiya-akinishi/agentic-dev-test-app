/**
 * コース詳細タブ `/tournament/[id]/course`（T-08-9 / 要求 1-19 / 補-1-19-1）。
 * 18ホールのリスト（No / Par / ヤード / ハンディキャップ）。行タップでホール詳細へ。
 */
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { FlatList, StyleSheet, View } from 'react-native'

import { Card, EmptyState, ErrorView, Loading, Txt } from '../../../../src/components/ui'
import { OfflineBar } from '../../../../src/components/OfflineBar'
import { relDoc } from '../../../../src/features/common'
import { CourseHoleListRow } from '../../../../src/features/venue'
import { TournamentTabs } from '../../../../src/features/tournaments'
import { RichText } from '../../../../src/lib/richtext'
import { useCourseHoles } from '../../../../src/queries/shots'
import { useTournament } from '../../../../src/queries/tournaments'
import { colors, space } from '../../../../src/theme'
import type { Course } from '../../../../src/types/payload'

export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: tournament, isLoading: tournamentLoading, error, refetch } = useTournament(id)
  const course = tournament ? relDoc<Course>(tournament.course) : undefined

  const { holes, isLoading: holesLoading, error: holesError, refetch: refetchHoles } = useCourseHoles(course?.id)

  const loading = tournamentLoading || (Boolean(course) && holesLoading)

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'コース' }} />
      <OfflineBar />
      <TournamentTabs tournamentId={id} active="course" />

      {loading ? (
        <Loading />
      ) : error || holesError ? (
        <ErrorView error={error ?? holesError} onRetry={() => { void refetch(); void refetchHoles() }} />
      ) : !course ? (
        <EmptyState icon="⛳" title="コース情報がまだ登録されていません" />
      ) : (
        <FlatList
          data={holes}
          keyExtractor={(h) => String(h.id)}
          ListHeaderComponent={<CourseHeader course={course} />}
          renderItem={({ item }) => (
            <CourseHoleListRow hole={item} onPress={() => router.push(`/tournament/${id}/course/${item.number}`)} />
          )}
          ListEmptyComponent={<EmptyState icon="⛳" title="ホール情報がまだ登録されていません" />}
        />
      )}
    </View>
  )
}

const CourseHeader = ({ course }: { course: Course }) => (
  <Card style={{ margin: space.lg, gap: space.sm }}>
    <Txt weight="bold" size="lg">
      {course.name}
    </Txt>
    <View style={{ flexDirection: 'row', gap: space.lg }}>
      <Txt size="sm" color={colors.textSub}>
        Par {course.par}
      </Txt>
      {course.totalYards ? (
        <Txt size="sm" color={colors.textSub}>
          {course.totalYards.toLocaleString('ja-JP')}Y
        </Txt>
      ) : null}
    </View>
    {course.description ? <RichText value={course.description} /> : null}
  </Card>
)

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
})
