/**
 * ログイン画面（T-05-1 / 6-2 / 補-6-2-1）。
 * `POST /api/users/login`（標準 REST）。2段階認証有効時は `/auth/2fa-challenge` へ。
 */
import { router, Stack } from 'expo-router'
import React, { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { Button, Divider, TextField, Txt } from '../../src/components/ui'
import { SnsLoginButtons } from '../../src/features/auth'
import { useLoginMutation } from '../../src/queries/auth'
import { colors, space } from '../../src/theme'
import type { ApiError } from '../../src/api/client'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const mutation = useLoginMutation()

  const submit = () => {
    mutation.mutate(
      { email: email.trim(), password },
      {
        onSuccess: (res) => {
          if (res.requiresTwoFactor) router.push('/auth/2fa-challenge')
          else router.back()
        },
      },
    )
  }

  const errorMessage = mutation.isError
    ? ((mutation.error as ApiError)?.message ?? 'ログインできませんでした')
    : undefined

  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
      <Stack.Screen options={{ title: 'ログイン' }} />

      <Txt size="xxl" weight="bold">
        ログイン
      </Txt>
      <Txt size="sm" color={colors.textSub}>
        アカウントをお持ちでなくても主要な機能はご利用いただけます（6-1）。
      </Txt>

      <View style={{ gap: space.md }}>
        <TextField
          label="メールアドレス"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextField
          label="パスワード"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        {errorMessage ? (
          <Txt size="sm" color={colors.danger}>
            {errorMessage}
          </Txt>
        ) : null}
        <Button
          title="ログイン"
          onPress={submit}
          loading={mutation.isPending}
          disabled={!email.trim() || !password}
        />
        <Pressable onPress={() => router.push('/auth/reset')} hitSlop={8}>
          <Txt size="sm" color={colors.primary} style={{ textAlign: 'center' }}>
            パスワードをお忘れの方
          </Txt>
        </Pressable>
      </View>

      <Divider />

      <SnsLoginButtons />

      <Divider />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xs }}>
        <Txt size="sm" color={colors.textSub}>
          アカウントをお持ちでない方は
        </Txt>
        <Pressable onPress={() => router.push('/auth/register')} hitSlop={8}>
          <Txt size="sm" color={colors.primary} weight="bold">
            新規登録
          </Txt>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.lg, marginTop: space.md }}>
        <Pressable onPress={() => router.push('/mypage/legal/terms')} hitSlop={8}>
          <Txt size="xs" color={colors.textMuted}>
            利用規約
          </Txt>
        </Pressable>
        <Pressable onPress={() => router.push('/mypage/legal/privacy')} hitSlop={8}>
          <Txt size="xs" color={colors.textMuted}>
            プライバシーポリシー
          </Txt>
        </Pressable>
      </View>
    </ScrollView>
  )
}
