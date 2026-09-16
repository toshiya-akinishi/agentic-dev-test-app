/**
 * パスワード再設定リクエスト画面（T-05-1 / 6-8 / 補-6-8-1）。
 * `POST /api/users/forgot-password`（標準 REST）。メール送信は cms 側で開発時コンソール出力（MOCK）。
 */
import { router, Stack } from 'expo-router'
import React, { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import type { ApiError } from '../../src/api/client'
import { Button, TextField, Txt } from '../../src/components/ui'
import { useForgotPasswordMutation } from '../../src/queries/auth'
import { colors, space } from '../../src/theme'

export default function ResetRequestScreen() {
  const [email, setEmail] = useState('')
  const mutation = useForgotPasswordMutation()

  const errorMessage = mutation.isError
    ? ((mutation.error as ApiError)?.message ?? '送信できませんでした')
    : undefined

  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
      <Stack.Screen options={{ title: 'パスワード再設定' }} />

      <Txt size="xxl" weight="bold">
        パスワードをお忘れの方
      </Txt>
      <Txt size="sm" color={colors.textSub}>
        登録済みのメールアドレスを入力してください。再設定用のリンクをお送りします（有効期限 1
        時間・補-6-8-1）。
      </Txt>

      {mutation.isSuccess ? (
        <View style={{ gap: space.md }}>
          <Txt size="sm" color={colors.success}>
            再設定メールを送信しました。メール内のリンクからパスワードを再設定してください。
          </Txt>
          <Pressable onPress={() => router.push('/auth/reset-password')} hitSlop={8}>
            <Txt size="sm" color={colors.primary}>
              トークンをお持ちの場合はこちら
            </Txt>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <TextField
            label="メールアドレス"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {errorMessage ? (
            <Txt size="sm" color={colors.danger}>
              {errorMessage}
            </Txt>
          ) : null}
          <Button
            title="再設定メールを送信"
            onPress={() => mutation.mutate(email.trim())}
            loading={mutation.isPending}
            disabled={!email.trim()}
          />
        </View>
      )}
    </ScrollView>
  )
}
