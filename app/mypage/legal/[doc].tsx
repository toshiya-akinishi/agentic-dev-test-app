/**
 * 利用規約・プライバシーポリシー表示（T-05-13 / 6-15 / 補-6-15-1）。
 * `legal-documents` global（`GET /api/globals/legal-documents`、標準 REST）から表示する。
 * ログイン画面・マイページの両方からリンクする。
 */
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useAtomValue } from 'jotai'
import React from 'react'
import { ScrollView, View } from 'react-native'

import { ErrorView, SkeletonList, Tabs, Txt } from '../../../src/components/ui'
import { RichText } from '../../../src/lib/richtext'
import { useLegalDocuments } from '../../../src/queries/auth'
import { authUserAtom } from '../../../src/store/auth'
import { colors, radius, space } from '../../../src/theme'

type DocKey = 'terms' | 'privacy'

const TITLE: Record<DocKey, string> = { terms: '利用規約', privacy: 'プライバシーポリシー' }

export default function LegalDocScreen() {
  const params = useLocalSearchParams<{ doc: string }>()
  const doc: DocKey = params.doc === 'privacy' ? 'privacy' : 'terms'
  const user = useAtomValue(authUserAtom)
  const { data, isLoading, error, refetch } = useLegalDocuments()

  const needsReconsent =
    Boolean(user) && Boolean(data?.version) && data?.version !== user?.agreedTermsVersion

  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: space.xxl }}>
      <Stack.Screen options={{ title: TITLE[doc] }} />

      <Tabs
        value={doc}
        options={[
          { value: 'terms', label: '利用規約' },
          { value: 'privacy', label: 'プライバシーポリシー' },
        ]}
        onChange={(v) => router.setParams({ doc: v })}
      />

      <View style={{ height: space.lg }} />

      {needsReconsent ? (
        <View
          style={{
            backgroundColor: colors.bgSubtle,
            borderRadius: radius.md,
            padding: space.md,
            marginBottom: space.lg,
          }}
        >
          <Txt size="sm" color={colors.textSub}>
            規約が更新されています（version {data?.version}）。最新の内容をご確認ください（補-6-15-2）。
          </Txt>
        </View>
      ) : null}

      {isLoading ? (
        <SkeletonList rows={8} />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : (
        <RichText value={doc === 'terms' ? data?.terms : data?.privacy} />
      )}
    </ScrollView>
  )
}
