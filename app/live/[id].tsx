/**
 * ライブ配信 `/live/[id]`（T-12-12 / 要求 2-1, 2-2 / 補-2-1-1, 2, 補-2-2-1〜3・MOCK）。
 * 構成: プレイヤー + 配信タイトル + 大会名 + 同時配信一覧（他の配信への切替）（補-2-2-2）。
 */
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { FlatList, ScrollView, StyleSheet, View } from 'react-native'

import { ErrorView, Loading, SectionHeader, Txt } from '../../src/components/ui'
import { relDoc } from '../../src/features/common'
import { LiveStreamListItem, LiveStreamPlayer } from '../../src/features/live'
import { useLiveStream, useLiveStreams } from '../../src/queries/liveStreams'
import { colors, space } from '../../src/theme'
import type { Tournament } from '../../src/types/payload'

export default function LiveStreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: stream, isLoading, error, refetch } = useLiveStream(id)
  const tournamentId = relDoc<Tournament>(stream?.tournament)?.id
  const { streams } = useLiveStreams(tournamentId ? String(tournamentId) : undefined)

  if (isLoading) return <Loading />
  if (error || !stream) return <ErrorView error={error} onRetry={() => void refetch()} />

  const tournament = relDoc<Tournament>(stream.tournament)
  const others = streams.filter((s) => s.id !== stream.id)

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: stream.title }} />
      <ScrollView>
        <LiveStreamPlayer stream={stream} />
        {tournament ? (
          <Txt size="sm" color={colors.textSub} style={{ paddingHorizontal: space.lg, marginTop: 2 }}>
            {tournament.name}
          </Txt>
        ) : null}

        {others.length > 0 ? (
          <View style={{ marginTop: space.lg }}>
            <SectionHeader title="同時配信一覧" />
            <FlatList
              data={others}
              keyExtractor={(s) => String(s.id)}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <LiveStreamListItem
                  stream={item}
                  active={false}
                  onPress={() => router.replace(`/live/${item.id}`)}
                />
              )}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
})
