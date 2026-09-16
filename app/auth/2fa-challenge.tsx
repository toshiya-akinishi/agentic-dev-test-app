/**
 * ログイン2段階目の TOTP 検証画面（T-05-6 / 補-6-2-2）。
 * ログイン画面で `requiresTwoFactor` が返った場合にここへ遷移する。
 * `pendingTwoFactorAtom` を参照するため、直接開かれた場合はログイン画面へ戻す。
 */
import { router, Stack } from 'expo-router'
import { useAtomValue } from 'jotai'
import React, { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'

import type { ApiError } from '../../src/api/client'
import { Button, TextField, Txt } from '../../src/components/ui'
import { normalizeRecoveryCode } from '../../src/lib/totp'
import { useTotpLoginRecoveryMutation, useTotpLoginVerifyMutation } from '../../src/queries/auth'
import { pendingTwoFactorAtom } from '../../src/store/auth'
import { colors, space } from '../../src/theme'

export default function TwoFactorChallengeScreen() {
  const pending = useAtomValue(pendingTwoFactorAtom)
  const [mode, setMode] = useState<'code' | 'recovery'>('code')
  const [code, setCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')

  const verifyMutation = useTotpLoginVerifyMutation()
  const recoveryMutation = useTotpLoginRecoveryMutation()
  const mutation = mode === 'code' ? verifyMutation : recoveryMutation

  useEffect(() => {
    if (!pending) router.replace('/auth/login')
  }, [pending])

  const errorMessage = mutation.isError
    ? ((mutation.error as ApiError)?.message ?? '確認できませんでした')
    : undefined

  const submit = () => {
    if (mode === 'code') {
      verifyMutation.mutate(code.trim(), { onSuccess: () => router.replace('/') })
    } else {
      recoveryMutation.mutate(normalizeRecoveryCode(recoveryCode), {
        onSuccess: () => router.replace('/'),
      })
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
      <Stack.Screen options={{ title: '2段階認証' }} />

      <Txt size="xxl" weight="bold">
        認証コードを入力
      </Txt>
      <Txt size="sm" color={colors.textSub}>
        {pending?.user.displayName ?? 'ご利用の'}
        さんのアカウントは2段階認証が有効です。認証アプリに表示されている6桁のコードを入力してください。
      </Txt>

      {mode === 'code' ? (
        <View style={{ gap: space.md }}>
          <TextField
            label="6桁コード"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          {errorMessage ? (
            <Txt size="sm" color={colors.danger}>
              {errorMessage}
            </Txt>
          ) : null}
          <Button
            title="確認"
            onPress={submit}
            loading={mutation.isPending}
            disabled={code.trim().length !== 6}
          />
          <Button title="リカバリコードを使う" variant="ghost" onPress={() => setMode('recovery')} />
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <TextField
            label="リカバリコード"
            value={recoveryCode}
            onChangeText={setRecoveryCode}
            autoCapitalize="characters"
            hint="有効化時に発行された10個のコードのいずれかを入力してください"
          />
          {errorMessage ? (
            <Txt size="sm" color={colors.danger}>
              {errorMessage}
            </Txt>
          ) : null}
          <Button
            title="確認"
            onPress={submit}
            loading={mutation.isPending}
            disabled={recoveryCode.trim().length === 0}
          />
          <Button title="6桁コードに戻る" variant="ghost" onPress={() => setMode('code')} />
        </View>
      )}
    </ScrollView>
  )
}
