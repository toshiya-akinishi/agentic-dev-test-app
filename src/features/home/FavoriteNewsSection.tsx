/**
 * お気に入り選手ニュース（要求 4-2 / 補-4-2-1, 補-4-2-2）。
 * お気に入り 0 件のときはニュースの代わりに登録導線カードを表示する（補-4-2-2）。
 */
import { router } from 'expo-router'
import React from 'react'
import { View } from 'react-native'

import { Card, EmptyState, SectionHeader } from '../../components/ui'
import { useFavoritePlayers } from '../../queries/home'
import { useFavoritePlayerNews } from '../../queries/news'
import { NewsRow } from '../news'
import { space } from '../../theme'

export const FavoriteNewsSection = () => {
  const { playerIds, isLoading: favoritesLoading } = useFavoritePlayers()
  const { data, isLoading: newsLoading } = useFavoritePlayerNews(playerIds)
  const items = data?.docs ?? []

  // お気に入りの読み込み中はちらつき防止のため何も出さない
  if (favoritesLoading) return null

  if (playerIds.length === 0) {
    // 補-4-2-2: 未登録時はセクションの代わりに導線カードを表示する
    return (
      <View style={{ marginTop: space.xl }}>
        <SectionHeader title="お気に入り選手のニュース" />
        <Card style={{ marginHorizontal: space.lg }}>
          <EmptyState
            icon="⭐"
            title="選手をお気に入り登録しませんか"
            description="お気に入り登録した選手のニュースがここに表示されます。"
            actionLabel="選手を探す"
            onAction={() => router.push('/players')}
          />
        </Card>
      </View>
    )
  }

  if (newsLoading || items.length === 0) return null

  return (
    <View style={{ marginTop: space.xl }}>
      <SectionHeader title="お気に入り選手のニュース" />
      {items.map((n) => (
        <NewsRow key={n.id} news={n} onPress={() => router.push(`/news/${n.id}`)} />
      ))}
    </View>
  )
}
