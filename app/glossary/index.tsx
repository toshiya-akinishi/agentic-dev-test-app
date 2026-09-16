/**
 * ゴルフ用語集 `/glossary`（要求 1-2 / 04-screen-spec.md 1章）。
 * 補-1-2-1: かな・別名（英字表記）でも一致するインクリメンタルサーチ（入力1文字から）。
 * 検索・カテゴリ絞り込みの UI 本体は `GlossaryList`（端末側で全件を絞り込む）。
 */
import { Stack, router } from 'expo-router'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { ErrorView, SkeletonList } from '../../src/components/ui'
import { OfflineBar } from '../../src/components/OfflineBar'
import { GlossaryList } from '../../src/features/guide'
import { useGlossaryTerms } from '../../src/queries/guide'
import { colors } from '../../src/theme'

export default function GlossaryIndexScreen() {
  const { data, isLoading, error, refetch } = useGlossaryTerms()
  const terms = data?.docs ?? []

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: '用語集' }} />
      <OfflineBar />

      {isLoading ? (
        <SkeletonList rows={8} />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : (
        <GlossaryList terms={terms} onSelect={(term) => router.push(`/glossary/${term.id}`)} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
})
