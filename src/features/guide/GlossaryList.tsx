/**
 * 用語集の検索 UI と一覧（要求 1-2 / 補-1-2-1）。
 *
 * 補-1-2-1: 入力 1 文字からのインクリメンタルサーチ。デバウンスを入れず、
 * 取得済みの全用語を端末側で絞り込むため 1 文字目から即座に結果が変わる。
 * 一致対象は 用語 / かな（reading）/ 別名・英字表記（aliases）。
 */
import React, { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native'

import { Badge, EmptyState, Tabs, Txt } from '../../components/ui'
import { richTextToPlainText } from '../../lib/richtext'
import { GLOSSARY_CATEGORY_LABELS } from '../../queries/guide'
import { colors, font, radius, space } from '../../theme'
import type { GlossaryTerm } from '../../types/payload'
import { filterGlossaryTerms } from './search'

/* ---------------- 用語行 ---------------- */

export const GlossaryRow = ({
  term,
  onPress,
}: {
  term: GlossaryTerm
  onPress: () => void
}) => {
  const preview = richTextToPlainText(term.description, 60)

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bgSubtle }]}
    >
      <View style={styles.rowHead}>
        <Txt weight="bold" size="md">
          {term.term}
        </Txt>
        {term.reading ? (
          <Txt size="xs" color={colors.textMuted}>
            {term.reading}
          </Txt>
        ) : null}
        {term.category ? (
          <Badge label={GLOSSARY_CATEGORY_LABELS[term.category] ?? term.category} />
        ) : null}
      </View>

      {preview ? (
        <Txt size="sm" color={colors.textSub} numberOfLines={2} style={styles.rowPreview}>
          {preview}
        </Txt>
      ) : null}
    </Pressable>
  )
}

/* ---------------- 検索つき一覧 ---------------- */

type CategoryFilter = 'all' | string

export const GlossaryList = ({
  terms,
  onSelect,
}: {
  terms: GlossaryTerm[]
  onSelect: (term: GlossaryTerm) => void
}) => {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')

  // 実データに存在するカテゴリだけをタブに出す
  const categoryOptions = useMemo(() => {
    const present = new Set(terms.map((t) => t.category).filter(Boolean) as string[])
    return [
      { value: 'all' as CategoryFilter, label: 'すべて' },
      ...Object.entries(GLOSSARY_CATEGORY_LABELS)
        .filter(([value]) => present.has(value))
        .map(([value, label]) => ({ value: value as CategoryFilter, label })),
    ]
  }, [terms])

  // 補-1-2-1: 入力のたびに絞り込む（1 文字目から反応する）
  const results = useMemo(
    () => filterGlossaryTerms(terms, query, category === 'all' ? null : category),
    [terms, query, category],
  )

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Txt size="md" color={colors.textMuted}>
          🔍
        </Txt>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="用語・かな・英字で検索（例: ばーでぃ / birdie）"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="用語を検索"
          style={styles.searchInput}
        />
        {query ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setQuery('')}>
            <Txt size="sm" color={colors.primary}>
              クリア
            </Txt>
          </Pressable>
        ) : null}
      </View>

      {categoryOptions.length > 1 ? (
        <Tabs
          scrollable
          value={category}
          options={categoryOptions}
          onChange={(v) => setCategory(v)}
        />
      ) : null}

      <Txt size="xs" color={colors.textMuted} style={styles.count}>
        {`${results.length}件`}
        {query ? `（「${query}」で検索）` : ''}
      </Txt>

      {results.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="該当する用語がありません"
          description="ひらがな・カタカナ・英字のいずれでも検索できます。別の言葉でお試しください。"
          actionLabel={query ? '検索条件をクリア' : undefined}
          onAction={
            query
              ? () => {
                  setQuery('')
                  setCategory('all')
                }
              : undefined
          }
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <GlossaryRow term={item} onPress={() => onSelect(item)} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    margin: space.lg,
    paddingHorizontal: space.md,
    height: 44,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: font.size.md,
    color: colors.text,
    paddingVertical: 0,
  },
  count: { paddingHorizontal: space.lg, paddingVertical: space.sm },
  listContent: { paddingBottom: space.xxl },
  row: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.xs },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  rowPreview: { lineHeight: font.size.sm * 1.5 },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: space.lg },
})
