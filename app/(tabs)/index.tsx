/**
 * ホーム `/`（EP-06 / 04-screen-spec.md 2章「ホーム」）。
 * 構成: 緊急バナー（app/_layout.tsx で全画面共通表示）/ ハイライトカルーセル(2-14) /
 *       広告枠 home_top_banner(8-3) / 開催中・直近大会カード(3-1) /
 *       大会ハイライト×お気に入り選手レーン(2-13 / T-12-7 / ADR-008) /
 *       お気に入り選手ニュース(4-2) / 最新ニュース5件(1-11) / 広告枠 home_inline(8-3)
 */
import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'

import { OfflineBar } from '../../src/components/OfflineBar'
import { AdSlot } from '../../src/features/ads'
import {
  FavoriteHighlightLanes,
  FavoriteNewsSection,
  HighlightCarousel,
  LatestNewsSection,
  TournamentCard,
} from '../../src/features/home'
import { colors } from '../../src/theme'

export default function HomeScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <OfflineBar />
      <HighlightCarousel />
      <AdSlot slot="home_top_banner" />
      <TournamentCard />
      <FavoriteHighlightLanes />
      <FavoriteNewsSection />
      <LatestNewsSection />
      <AdSlot slot="home_inline" />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32 },
})
