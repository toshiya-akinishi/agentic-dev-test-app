/**
 * 選手詳細 `/player/[id]`（T-13-2 / 要求 4-7 / 補-4-7-1, 2）。
 * 5タブ: プロフィール / 成績 / ストーリー / 動画 / 使用ギア（補-4-7-1）。
 * 成績タブでは開催中大会の行にカット通過確率バッジを出す（4-14 / T-13-7）。
 */
import { Image } from 'expo-image'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React, { useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { Card, EmptyState, ErrorView, Loading, SkeletonList, Tabs, Txt } from '../../src/components/ui'
import { mediaUrl } from '../../src/features/common'
import { FavoriteStarButton, PlayerGearList, PlayerResultRow, PlayerStoryCard } from '../../src/features/players'
import { VideoCard } from '../../src/features/videos'
import { useMyProfile } from '../../src/queries/auth'
import { RichText } from '../../src/lib/richtext'
import {
  usePlayer,
  usePlayerResults,
  usePlayerSeasonSummary,
  usePlayerStories,
} from '../../src/queries/players'
import { useCurrentSeason } from '../../src/queries/tournaments'
import { useVideoList } from '../../src/queries/videos'
import { colors, space } from '../../src/theme'

type Tab = 'profile' | 'results' | 'story' | 'video' | 'gear'

const TAB_OPTIONS: Array<{ value: Tab; label: string }> = [
  { value: 'profile', label: 'プロフィール' },
  { value: 'results', label: '成績' },
  { value: 'story', label: 'ストーリー' },
  { value: 'video', label: '動画' },
  { value: 'gear', label: '使用ギア' },
]

/** 生年月日から年齢を算出（補-4-7-2） */
const calcAge = (birthDate?: string | null): number | undefined => {
  if (!birthDate) return undefined
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return undefined
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const monthDiff = now.getMonth() - b.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < b.getDate())) age -= 1
  return age
}

const formatBirthDate = (iso?: string | null): string | undefined => {
  if (!iso) return undefined
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return undefined
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const playerId = id ? Number(id) : undefined
  const { data: player, isLoading, error, refetch } = usePlayer(id)
  const [tab, setTab] = useState<Tab>('profile')

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: '選手' }} />
        <SkeletonList rows={6} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: '選手' }} />
        <ErrorView error={error} onRetry={() => void refetch()} />
      </View>
    )
  }

  if (!player) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: '選手' }} />
        <EmptyState
          icon="🏌️"
          title="選手が見つかりませんでした"
          actionLabel="選手一覧へ"
          onAction={() => router.replace('/players')}
        />
      </View>
    )
  }

  const photo = mediaUrl(player.photo, 'hero')

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: player.name }} />

      <View style={styles.header}>
        {photo ? (
          <Image source={{ uri: photo }} contentFit="cover" style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <Txt size="xxl" color={colors.textInverse} weight="bold">
              {player.name.slice(0, 1)}
            </Txt>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Txt size="xl" weight="bold" numberOfLines={1}>
            {player.name}
          </Txt>
          {player.nameEn ? (
            <Txt size="sm" color={colors.textMuted} numberOfLines={1}>
              {player.nameEn}
            </Txt>
          ) : null}
        </View>
        <FavoriteStarButton playerId={player.id} size="lg" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="この選手の通知設定"
          hitSlop={10}
          onPress={() => router.push(`/mypage/notifications?playerId=${player.id}`)}
          style={styles.notificationButton}
        >
          <Txt size="xl">🔔</Txt>
        </Pressable>
      </View>

      <Tabs value={tab} onChange={setTab} options={TAB_OPTIONS} scrollable />

      <View style={{ flex: 1 }}>
        {tab === 'profile' ? <ProfileTab player={player} /> : null}
        {tab === 'results' ? <ResultsTab playerId={playerId} /> : null}
        {tab === 'story' ? <StoryTab playerId={id} /> : null}
        {tab === 'video' ? <VideoTab playerId={id} /> : null}
        {tab === 'gear' ? <GearTab player={player} /> : null}
      </View>
    </View>
  )
}

/* ---------------- プロフィールタブ（補-4-7-2） ---------------- */

const ProfileTab = ({ player }: { player: NonNullable<ReturnType<typeof usePlayer>['data']> }) => {
  const { season } = useCurrentSeason()
  const { moneyRank, pointsRank, scoringAverageLabel } = usePlayerSeasonSummary(
    season ? String(season.id) : undefined,
    player.id,
  )
  const age = calcAge(player.birthDate)
  const birth = formatBirthDate(player.birthDate)
  const highlights = [...(player.careerHighlights ?? [])].sort((a, b) => b.year - a.year)

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Card style={{ gap: space.sm }}>
        <Txt weight="bold">今季成績サマリ</Txt>
        <View style={styles.summaryRow}>
          <SummaryStat label="賞金ランキング" value={moneyRank ? `${moneyRank}位` : '-'} />
          <SummaryStat label="ポイントランキング" value={pointsRank ? `${pointsRank}位` : '-'} />
          <SummaryStat label="平均ストローク" value={scoringAverageLabel ?? '-'} />
        </View>
      </Card>

      <Card style={{ gap: space.xs }}>
        <Row label="生年月日" value={birth ? `${birth}${age !== undefined ? `（${age}歳）` : ''}` : '-'} />
        <Row label="出身地" value={player.birthPlace ?? '-'} />
        <Row
          label="身長 / 体重"
          value={
            player.height || player.weight
              ? `${player.height ? `${player.height}cm` : '-'} / ${player.weight ? `${player.weight}kg` : '-'}`
              : '-'
          }
        />
        <Row label="プロ転向" value={player.turnedProYear ? `${player.turnedProYear}年` : '-'} />
      </Card>

      {highlights.length > 0 ? (
        <Card style={{ gap: space.sm }}>
          <Txt weight="bold">経歴ハイライト</Txt>
          {highlights.map((h, i) => (
            <View key={h.id ?? i} style={{ flexDirection: 'row', gap: space.sm }}>
              <Txt size="sm" color={colors.textMuted} style={{ width: 48 }}>
                {h.year}
              </Txt>
              <Txt size="sm" style={{ flex: 1 }}>
                {h.title}
              </Txt>
            </View>
          ))}
        </Card>
      ) : null}

      {player.bio ? (
        <View style={{ paddingHorizontal: space.xs }}>
          <RichText value={player.bio} />
        </View>
      ) : null}
    </ScrollView>
  )
}

const SummaryStat = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
    <Txt size="lg" weight="bold">
      {value}
    </Txt>
    <Txt size="xs" color={colors.textMuted}>
      {label}
    </Txt>
  </View>
)

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    <Txt size="sm" color={colors.textMuted}>
      {label}
    </Txt>
    <Txt size="sm">{value}</Txt>
  </View>
)

/* ---------------- 成績タブ（4-14 / T-13-7） ---------------- */

const ResultsTab = ({ playerId }: { playerId: number | undefined }) => {
  const { results, isLoading, error, refetch } = usePlayerResults(playerId)

  if (isLoading) return <SkeletonList rows={5} />
  if (error) return <ErrorView error={error} onRetry={() => void refetch()} />
  if (results.length === 0) {
    return <EmptyState icon="📋" title="成績データがありません" />
  }

  return (
    <FlatList
      data={results}
      keyExtractor={(r) => String(r.tournament.id)}
      renderItem={({ item }) => <PlayerResultRow result={item} />}
      contentContainerStyle={{ paddingBottom: space.xxl }}
    />
  )
}

/* ---------------- ストーリータブ（4-1 / 補-4-1-1, 2） ---------------- */

const StoryTab = ({ playerId }: { playerId: string | undefined }) => {
  const { data, isLoading, error, refetch } = usePlayerStories(playerId)
  const stories = data?.docs ?? []

  if (isLoading) return <SkeletonList rows={3} />
  if (error) return <ErrorView error={error} onRetry={() => void refetch()} />
  if (stories.length === 0) {
    return <EmptyState icon="🎬" title="ストーリーがまだありません" />
  }

  return (
    <FlatList
      data={stories}
      keyExtractor={(s) => String(s.id)}
      contentContainerStyle={{ padding: space.lg, gap: space.md }}
      renderItem={({ item }) => {
        const videoId = typeof item.video === 'object' && item.video ? item.video.id : undefined
        return (
          <PlayerStoryCard story={item} onPress={videoId ? () => router.push(`/video/${videoId}`) : undefined} />
        )
      }}
    />
  )
}

/* ---------------- 動画タブ ---------------- */

const VideoTab = ({ playerId }: { playerId: string | undefined }) => {
  const { items, isLoading, error, refetch, fetchNextPage, hasNextPage } = useVideoList({
    player: playerId,
    sort: 'newest',
  })

  if (isLoading) return <SkeletonList rows={4} />
  if (error) return <ErrorView error={error} onRetry={() => void refetch()} />
  if (items.length === 0) {
    return <EmptyState icon="🎥" title="動画がまだありません" />
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(v) => String(v.id)}
      numColumns={2}
      columnWrapperStyle={{ gap: space.md, paddingHorizontal: space.lg }}
      contentContainerStyle={{ paddingVertical: space.lg, gap: space.lg }}
      onEndReached={() => {
        if (hasNextPage) void fetchNextPage()
      }}
      renderItem={({ item }) => (
        <View style={{ flex: 1 }}>
          <VideoCard video={item} onPress={() => router.push(`/video/${item.id}`)} />
        </View>
      )}
    />
  )
}

/* ---------------- 使用ギアタブ（4-6 / 補-4-6-1, 2） ---------------- */

const GearTab = ({ player }: { player: NonNullable<ReturnType<typeof usePlayer>['data']> }) => {
  const { data: me } = useMyProfile()
  const equipment = player.equipment ?? []

  if (equipment.length === 0) {
    return <EmptyState icon="🎒" title="使用ギア情報がまだありません" />
  }

  return (
    <ScrollView>
      <PlayerGearList equipment={equipment} mySettings={me?.user.golfClubSetting} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
  },
  photo: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight },
  notificationButton: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  tabContent: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  summaryRow: { flexDirection: 'row' },
})
