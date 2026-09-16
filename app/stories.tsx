/**
 * 縦型ストーリー `/stories`（T-12-6 / 要求 2-12）。
 * 動画一覧上部の丸サムネ列からの入口。`index` パラメータで開始位置を指定する。
 */
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { View } from 'react-native'

import { Loading } from '../src/components/ui'
import { StoryViewer } from '../src/features/story'
import { useStoryFeed } from '../src/queries/stories'
import { colors } from '../src/theme'

export default function StoriesScreen() {
  const { index } = useLocalSearchParams<{ index?: string }>()
  const { items, isLoading } = useStoryFeed()

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }} />
      {isLoading ? (
        <Loading />
      ) : (
        <StoryViewer items={items} initialIndex={Number(index ?? 0) || 0} onClose={() => router.back()} />
      )}
    </View>
  )
}
