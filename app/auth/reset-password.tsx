/**
 * 新パスワード設定画面（T-05-1 / 6-8 / 補-6-8-1）。
 * メール内リンク（`?token=...`）から開くか、トークンを手入力して新しいパスワードを設定する。
 * `POST /api/users/reset-password`（標準 REST）。
 */
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, View } from 'react-native'

import type { ApiError } from '../../src/api/client'
import { Button, TextField, Txt } from '../../src/components/ui'
import { PasswordStrengthMeter } from '../../src/features/auth'
import { passwordMeetsRequirement } from '../../src/lib/password'
import { useResetPasswordMutation } from '../../src/queries/auth'
import { colors, space } from '../../src/theme'

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>()
  const [token, setToken] = useState(params.token ?? '')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const mutation = useResetPasswordMutation()

  const canSubmit =
    token.trim().length > 0 && passwordMeetsRequirement(password) && password === passwordConfirm

  const errorMessage = mutation.isError
    ? ((mutation.error as ApiError)?.message ?? '再設定できませんでした')
    : undefined

  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
      <Stack.Screen options={{ title: '新しいパスワード' }} />

      <Txt size="xxl" weight="bold">
        新しいパスワードを設定
      </Txt>

      <View style={{ gap: space.md }}>
        <TextField
          label="再設定トークン"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          hint="メールに記載されたリンクから開いた場合は自動入力されています"
        />
        <View>
          <TextField label="新しいパスワード" value={password} onChangeText={setPassword} secureTextEntry />
          <View style={{ marginTop: space.xs }}>
            <PasswordStrengthMeter password={password} />
          </View>
        </View>
        <TextField
          label="新しいパスワード（確認）"
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          secureTextEntry
          error={
            passwordConfirm.length > 0 && passwordConfirm !== password ? 'パスワードが一致しません' : undefined
          }
        />
        {errorMessage ? (
          <Txt size="sm" color={colors.danger}>
            {errorMessage}
          </Txt>
        ) : null}
        <Button
          title="パスワードを再設定"
          disabled={!canSubmit}
          loading={mutation.isPending}
          onPress={() =>
            mutation.mutate(
              { token: token.trim(), password },
              { onSuccess: () => router.replace('/') },
            )
          }
        />
      </View>
    </ScrollView>
  )
}
