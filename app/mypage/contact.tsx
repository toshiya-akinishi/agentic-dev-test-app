/**
 * お問い合わせフォーム（T-05-12 / 6-14 / 補-6-14-1, 補-6-14-2）。
 * ゲストでも氏名・メールアドレス入力で送信できる（補-6-1-2 の例外）。
 * `POST /api/inquiries`（標準 REST）。返信は Ph1 対象外、メール運用前提。
 */
import { Stack } from 'expo-router'
import { useAtomValue } from 'jotai'
import React, { useState } from 'react'
import { ScrollView, View } from 'react-native'

import type { ApiError } from '../../src/api/client'
import { Button, Card, Tabs, TextField, Txt } from '../../src/components/ui'
import { useSubmitInquiry } from '../../src/queries/auth'
import { authUserAtom, deviceIdAtom } from '../../src/store/auth'
import { colors, space } from '../../src/theme'
import type { Inquiry } from '../../src/types/payload'

const CATEGORY_OPTIONS: Array<{ value: Inquiry['category']; label: string }> = [
  { value: 'account', label: 'アカウント' },
  { value: 'ticket', label: 'チケット' },
  { value: 'video', label: '動画' },
  { value: 'notification', label: '通知' },
  { value: 'onsite', label: '現地観戦' },
  { value: 'other', label: 'その他' },
]

export default function ContactScreen() {
  const user = useAtomValue(authUserAtom)
  const deviceId = useAtomValue(deviceIdAtom)

  const [category, setCategory] = useState<Inquiry['category']>('account')
  const [name, setName] = useState(user?.displayName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [body, setBody] = useState('')

  const mutation = useSubmitInquiry()

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && body.trim().length > 0
  const errorMessage = mutation.isError
    ? ((mutation.error as ApiError)?.message ?? '送信できませんでした')
    : undefined

  if (mutation.isSuccess) {
    const created = mutation.data?.doc
    return (
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
        <Stack.Screen options={{ title: 'お問い合わせ' }} />
        <Card>
          <Txt size="lg" weight="bold">
            送信しました
          </Txt>
          <Txt size="sm" color={colors.textSub} style={{ marginTop: space.sm }}>
            お問い合わせ番号: #{created?.id ?? '-'}
          </Txt>
          <Txt size="sm" color={colors.textSub} style={{ marginTop: space.sm }}>
            ご記入いただいたメールアドレス宛にご連絡いたします（補-6-14-2）。
          </Txt>
          <Button title="閉じる" style={{ marginTop: space.lg }} onPress={() => mutation.reset()} variant="ghost" />
        </Card>
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
      <Stack.Screen options={{ title: 'お問い合わせ' }} />

      <Txt size="xxl" weight="bold">
        お問い合わせ
      </Txt>
      <Txt size="sm" color={colors.textSub}>
        J-Tour運営へのお問い合わせはこちらから送信できます。
      </Txt>

      <Txt size="sm" weight="medium" color={colors.textSub}>
        お問い合わせ種別
      </Txt>
      <Tabs value={category} options={CATEGORY_OPTIONS} onChange={setCategory} scrollable />

      <TextField label="お名前（必須）" value={name} onChangeText={setName} />
      <TextField
        label="メールアドレス（必須）"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextField
        label="お問い合わせ内容（必須）"
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={6}
        style={{ minHeight: 120, textAlignVertical: 'top', paddingTop: space.sm }}
      />

      {errorMessage ? (
        <Txt size="sm" color={colors.danger}>
          {errorMessage}
        </Txt>
      ) : null}

      <Button
        title="送信する"
        disabled={!canSubmit}
        loading={mutation.isPending}
        onPress={() =>
          mutation.mutate({
            name: name.trim(),
            email: email.trim(),
            category,
            body: body.trim(),
            deviceId: !user ? (deviceId ?? undefined) : undefined,
          })
        }
      />
    </ScrollView>
  )
}
