/**
 * 用語詳細 `/glossary/[id]`（要求 1-2）。
 * 補-1-2-2: 関連用語（`relatedTerms`）を最大 5 件表示する。
 * 補-1-2-3: 本文中の用語リンクは CMS で手動設定されたものだけを辿る（自動リンク化はしない）。
 */
import { Stack, router, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { Linking, ScrollView, StyleSheet, View } from 'react-native'

import { Badge, EmptyState, ErrorView, SkeletonList, Txt } from '../../src/components/ui'
import { OfflineBar } from '../../src/components/OfflineBar'
import { internalRouteFor } from '../../src/features/common'
import { RelatedTerms } from '../../src/features/guide'
import { RichText, type RichTextLinkTarget } from '../../src/lib/richtext'
import { GLOSSARY_CATEGORY_LABELS, useGlossaryTerm } from '../../src/queries/guide'
import { colors, space } from '../../src/theme'
import type { GlossaryTerm } from '../../src/types/payload'

/** 手動設定されたリンクの遷移先を決める（補-1-2-3） */
const openLink = (target: RichTextLinkTarget) => {
  const route = internalRouteFor(target)
  if (route) {
    router.push(route)
    return
  }
  if (target.url) void Linking.openURL(target.url).catch(() => undefined)
}

export default function GlossaryTermScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: term, isLoading, error, refetch } = useGlossaryTerm(id)

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: '用語集' }} />
        <OfflineBar />
        <SkeletonList rows={5} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: '用語集' }} />
        <OfflineBar />
        <ErrorView error={error} onRetry={() => void refetch()} />
      </View>
    )
  }

  if (!term) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: '用語集' }} />
        <OfflineBar />
        <EmptyState
          icon="📘"
          title="用語が見つかりませんでした"
          description="削除された可能性があります。用語集一覧からお探しください。"
          actionLabel="用語集一覧へ"
          onAction={() => router.push('/glossary')}
        />
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: term.term }} />
      <OfflineBar />

      <View style={styles.header}>
        {term.category ? (
          <Badge
            label={GLOSSARY_CATEGORY_LABELS[term.category] ?? term.category}
            color={colors.primary}
            bg="#E7F1EA"
          />
        ) : null}
        <Txt size="xxl" weight="bold">
          {term.term}
        </Txt>
        {term.reading ? (
          <Txt size="md" color={colors.textMuted}>
            {term.reading}
          </Txt>
        ) : null}
      </View>

      <RichText value={term.description} onPressLink={openLink} />

      {/* 補-1-2-2: 関連用語を最大 5 件表示 */}
      <RelatedTerms
        related={term.relatedTerms}
        onSelect={(related: GlossaryTerm) => router.push(`/glossary/${related.id}`)}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xxl },
  header: { gap: space.sm, marginBottom: space.lg },
})
