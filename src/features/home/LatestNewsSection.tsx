/**
 * ホームの最新ニュース（要求 1-11 / 補-1-11-1）。
 * `isPinned` 最上位 → `publishedAt` 降順で 5 件。「もっと見る」でニュース一覧へ。
 */
import { router } from 'expo-router'
import React from 'react'
import { View } from 'react-native'

import { SectionHeader } from '../../components/ui'
import { useLatestNews } from '../../queries/news'
import { NewsRow } from '../news'
import { space } from '../../theme'

export const LatestNewsSection = () => {
  const { data, isLoading, error } = useLatestNews()
  const items = data?.docs ?? []

  if (isLoading || error || items.length === 0) return null

  return (
    <View style={{ marginTop: space.xl }}>
      <SectionHeader title="最新ニュース" actionLabel="もっと見る" onAction={() => router.push('/news')} />
      {items.map((n) => (
        <NewsRow key={n.id} news={n} onPress={() => router.push(`/news/${n.id}`)} />
      ))}
    </View>
  )
}
