/**
 * ホーム中段のハイライトレーン（T-12-7 / 要求 2-13 / 補-2-13-1 / ADR-008）。
 *
 * 2-14（`HighlightCarousel`・ホーム最上部・全ユーザー共通・運営編成）とは別レーンとして、
 * 2 系統を分けて表示する:
 *  (a) 大会ハイライト = `highlight-reels.type=tournament_daily`（運営が CMS で手動選定）
 *  (b) お気に入り選手のプレー動画 = `favorites` から動的生成（ユーザー依存）
 * `src/queries/home.ts` の `useFavoritePlayerScores`（4-13 のスコア部分）とは別に、
 * こちらは動画部分（2-13(b)）を担当する。
 */
import { Image } from 'expo-image'
import { router } from 'expo-router'
import React from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { EmptyState, SectionHeader } from '../../components/ui'
import { mediaUrl } from '../common'
import { useFavoritePlayers, useHomeTournament } from '../../queries/home'
import { useFavoritePlayerReel, useTournamentHighlightReel } from '../../queries/stories'
import { colors, radius, space } from '../../theme'
import type { Video } from '../../types/payload'

const Lane = ({ title, videos }: { title: string; videos: Video[] }) => {
  if (!videos.length) return null
  return (
    <View style={{ marginTop: space.lg }}>
      <SectionHeader title={title} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {videos.map((v) => (
          <Pressable key={v.id} onPress={() => router.push(`/video/${v.id}`)} style={styles.item}>
            <Image source={{ uri: mediaUrl(v.thumbnail, 'card') }} contentFit="cover" style={styles.thumb} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

export const FavoriteHighlightLanes = () => {
  const { tournament } = useHomeTournament()
  const { videos: tournamentVideos, isLoading: tLoading } = useTournamentHighlightReel(tournament?.id)
  const { playerIds, isLoading: favLoading } = useFavoritePlayers()
  const { videos: favoriteVideos, isLoading: favVideosLoading } = useFavoritePlayerReel()

  if (tLoading || favLoading) return null

  // 補-4-2-2 と同じ方針: お気に入り 0 件でも大会ハイライトはあり得るので、両方 0 件のときだけ何も出さない
  if (!tournamentVideos.length && !favVideosLoading && playerIds.length === 0) return null

  return (
    <View>
      <Lane title="大会ハイライト" videos={tournamentVideos} />
      {playerIds.length > 0 && !favVideosLoading && favoriteVideos.length === 0 ? (
        <View style={{ marginTop: space.lg }}>
          <SectionHeader title="お気に入り選手のプレー動画" />
          <EmptyState icon="🎬" title="お気に入り選手の動画" description="お気に入り選手の動画はまだありません。" />
        </View>
      ) : (
        <Lane title="お気に入り選手のプレー動画" videos={favoriteVideos} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { gap: space.md, paddingHorizontal: space.lg },
  item: { width: 160 },
  thumb: {
    width: 160,
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: colors.bgSubtle,
  },
})
