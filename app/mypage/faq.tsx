/**
 * FAQ 画面（T-05-11 / 6-13 / 補-6-13-1）。
 * カテゴリ別アコーディオン + キーワード検索。ゲストでも閲覧できる。
 */
import { Stack } from 'expo-router'
import React, { useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { EmptyState, ErrorView, SkeletonList, Tabs, TextField, Txt } from '../../src/components/ui'
import { richTextToPlainText, RichText } from '../../src/lib/richtext'
import { useFaqs } from '../../src/queries/auth'
import { colors, radius, space } from '../../src/theme'
import type { Faq } from '../../src/types/payload'

type Category = NonNullable<Faq['category']> | 'all'

const CATEGORY_OPTIONS: Array<{ value: Category; label: string }> = [
  { value: 'all', label: 'すべて' },
  { value: 'account', label: 'アカウント' },
  { value: 'ticket', label: 'チケット' },
  { value: 'video', label: '動画' },
  { value: 'notification', label: '通知' },
  { value: 'onsite', label: '現地観戦' },
  { value: 'other', label: 'その他' },
]

export default function FaqScreen() {
  const [category, setCategory] = useState<Category>('all')
  const [keyword, setKeyword] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)
  const { data, isLoading, error, refetch } = useFaqs()

  const faqs = data?.docs ?? []

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return faqs.filter((f) => {
      if (category !== 'all' && f.category !== category) return false
      if (!kw) return true
      const answerText = richTextToPlainText(f.answer, 500).toLowerCase()
      return f.question.toLowerCase().includes(kw) || answerText.includes(kw)
    })
  }, [faqs, category, keyword])

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: space.xxl }}>
      <Stack.Screen options={{ title: 'よくある質問' }} />

      <View style={{ padding: space.lg, gap: space.md }}>
        <TextField value={keyword} onChangeText={setKeyword} placeholder="キーワードで検索" />
        <Tabs value={category} options={CATEGORY_OPTIONS} onChange={setCategory} scrollable />
      </View>

      {isLoading ? (
        <SkeletonList rows={5} />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="❓" title="該当するFAQがありません" description="キーワードやカテゴリを変えてお試しください。" />
      ) : (
        <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
          {filtered.map((f) => (
            <FaqItem
              key={f.id}
              faq={f}
              open={openId === f.id}
              onToggle={() => setOpenId(openId === f.id ? null : f.id)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const FaqItem = ({ faq, open, onToggle }: { faq: Faq; open: boolean; onToggle: () => void }) => (
  <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' }}>
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: space.lg,
        backgroundColor: colors.bgElevated,
      }}
    >
      <Txt weight="bold" style={{ flex: 1 }}>
        Q. {faq.question}
      </Txt>
      <Txt color={colors.textMuted}>{open ? '▲' : '▼'}</Txt>
    </Pressable>
    {open ? (
      <View style={{ padding: space.lg, paddingTop: 0, backgroundColor: colors.bgSubtle }}>
        <RichText value={faq.answer} />
      </View>
    ) : null}
  </View>
)
