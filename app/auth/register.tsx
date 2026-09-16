/**
 * 新規登録画面（T-05-1 / 6-4 / 補-6-4-2, 補-6-15-2）。
 * ワンステップ登録: 表示名 + メールアドレス + パスワードのみ必須。
 * 規約同意チェックを必須にし、同意バージョンを記録する（補-6-15-2）。
 */
import { router, Stack } from 'expo-router'
import React, { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import type { ApiError } from '../../src/api/client'
import { Button, Checkbox, Divider, TextField, Txt } from '../../src/components/ui'
import { PasswordStrengthMeter, SnsLoginButtons } from '../../src/features/auth'
import { passwordMeetsRequirement } from '../../src/lib/password'
import { useLegalDocuments, useRegisterMutation } from '../../src/queries/auth'
import { colors, space } from '../../src/theme'

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [agreed, setAgreed] = useState(false)

  const legal = useLegalDocuments()
  const mutation = useRegisterMutation()

  const passwordsMatch = password.length > 0 && password === passwordConfirm
  const canSubmit =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    passwordMeetsRequirement(password) &&
    passwordsMatch &&
    agreed

  const submit = () => {
    if (!canSubmit) return
    mutation.mutate(
      {
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        agreedTermsVersion: legal.data?.version ?? undefined,
      },
      { onSuccess: () => router.replace('/auth/survey') },
    )
  }

  const errorMessage = mutation.isError
    ? ((mutation.error as ApiError)?.message ?? '登録できませんでした')
    : undefined

  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
      <Stack.Screen options={{ title: '新規登録' }} />

      <Txt size="xxl" weight="bold">
        新規登録
      </Txt>
      <Txt size="sm" color={colors.textSub}>
        メールアドレスとパスワードだけで登録できます。その他のプロフィール情報はあとから追加できます（補-6-4-2）。
      </Txt>

      <View style={{ gap: space.md }}>
        <TextField label="表示名（必須）" value={displayName} onChangeText={setDisplayName} maxLength={40} />
        <TextField
          label="メールアドレス（必須）"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <View>
          <TextField
            label="パスワード（必須）"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <View style={{ marginTop: space.xs }}>
            <PasswordStrengthMeter password={password} />
          </View>
        </View>
        <TextField
          label="パスワード（確認）"
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          secureTextEntry
          error={passwordConfirm.length > 0 && !passwordsMatch ? 'パスワードが一致しません' : undefined}
        />

        <Checkbox
          checked={agreed}
          onChange={setAgreed}
          label={
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
              <Pressable onPress={() => router.push('/mypage/legal/terms')} hitSlop={4}>
                <Txt size="sm" color={colors.primary}>
                  利用規約
                </Txt>
              </Pressable>
              <Txt size="sm">・</Txt>
              <Pressable onPress={() => router.push('/mypage/legal/privacy')} hitSlop={4}>
                <Txt size="sm" color={colors.primary}>
                  プライバシーポリシー
                </Txt>
              </Pressable>
              <Txt size="sm">に同意する</Txt>
            </View>
          }
        />

        {errorMessage ? (
          <Txt size="sm" color={colors.danger}>
            {errorMessage}
          </Txt>
        ) : null}

        <Button title="登録する" onPress={submit} loading={mutation.isPending} disabled={!canSubmit} />
      </View>

      <Divider />

      <SnsLoginButtons />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xs, marginTop: space.md }}>
        <Txt size="sm" color={colors.textSub}>
          すでにアカウントをお持ちの方は
        </Txt>
        <Pressable onPress={() => router.replace('/auth/login')} hitSlop={8}>
          <Txt size="sm" color={colors.primary} weight="bold">
            ログイン
          </Txt>
        </Pressable>
      </View>
    </ScrollView>
  )
}
