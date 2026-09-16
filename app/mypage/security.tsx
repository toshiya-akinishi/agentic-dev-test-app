/**
 * セキュリティ設定（2段階認証）画面（T-05-6 / 6-2 / 補-6-2-2）。
 *
 * `POST /api/auth/2fa/enroll` `POST /api/auth/2fa/verify` `POST /api/auth/2fa/disable` は
 * cms 側にまだ実装されていないカスタムエンドポイント。実装されるまでは 404 になる
 * （想定内・許容されたギャップ。最終報告に契約を明記）。
 */
import { Stack } from 'expo-router'
import { useAtomValue } from 'jotai'
import QRCode from 'react-native-qrcode-svg'
import React, { useState } from 'react'
import { ScrollView, View } from 'react-native'

import type { ApiError } from '../../src/api/client'
import { Button, Card, ErrorView, TextField, Txt } from '../../src/components/ui'
import { buildOtpAuthUrl } from '../../src/lib/totp'
import {
  useTotpDisableMutation,
  useTotpEnrollMutation,
  useTotpVerifyMutation,
} from '../../src/queries/auth'
import { authUserAtom } from '../../src/store/auth'
import { colors, space } from '../../src/theme'

type Step = 'idle' | 'enrolling' | 'verifying' | 'recovery-codes'

export default function SecurityScreen() {
  const user = useAtomValue(authUserAtom)
  const [step, setStep] = useState<Step>('idle')
  const [enrollData, setEnrollData] = useState<{ secret: string; otpauthUrl: string } | null>(null)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [disableCode, setDisableCode] = useState('')

  const enrollMutation = useTotpEnrollMutation()
  const verifyMutation = useTotpVerifyMutation()
  const disableMutation = useTotpDisableMutation()

  const startEnroll = () => {
    setStep('enrolling')
    enrollMutation.mutate(undefined, {
      onSuccess: (res) => {
        const otpauthUrl =
          res.otpauthUrl ??
          buildOtpAuthUrl({ secret: res.secret, accountName: user?.email ?? 'user' })
        setEnrollData({ secret: res.secret, otpauthUrl })
        setStep('verifying')
      },
    })
  }

  const submitVerify = () => {
    verifyMutation.mutate(code.trim(), {
      onSuccess: (res) => {
        setRecoveryCodes(res.recoveryCodes)
        setStep('recovery-codes')
      },
    })
  }

  const submitDisable = () => {
    disableMutation.mutate(disableCode.trim(), {
      onSuccess: () => {
        setStep('idle')
        setDisableCode('')
      },
    })
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
      <Stack.Screen options={{ title: 'セキュリティ' }} />

      <Txt size="xxl" weight="bold">
        2段階認証（TOTP）
      </Txt>
      <Txt size="sm" color={colors.textSub}>
        認証アプリ（Google Authenticator 等）と連携し、ログイン時にパスワードに加えて6桁のコード入力を求めます（補-6-2-2）。
      </Txt>

      <Card>
        <Txt weight="bold">現在の状態</Txt>
        <Txt size="sm" color={user?.twoFactorEnabled ? colors.success : colors.textSub} style={{ marginTop: space.xs }}>
          {user?.twoFactorEnabled ? '有効' : '無効'}
        </Txt>
      </Card>

      {step === 'idle' && !user?.twoFactorEnabled ? (
        <Button title="2段階認証を有効にする" onPress={startEnroll} loading={enrollMutation.isPending} />
      ) : null}

      {enrollMutation.isError && step === 'enrolling' ? (
        <ErrorView error={enrollMutation.error} onRetry={startEnroll} />
      ) : null}

      {step === 'verifying' && enrollData ? (
        <Card style={{ gap: space.md, alignItems: 'center' }}>
          <Txt weight="bold">認証アプリでQRコードを読み取ってください</Txt>
          <QRCode value={enrollData.otpauthUrl} size={180} />
          <Txt size="xs" color={colors.textMuted} selectable style={{ textAlign: 'center' }}>
            読み取れない場合はこのキーを手入力: {enrollData.secret}
          </Txt>
          <View style={{ width: '100%', gap: space.md }}>
            <TextField
              label="認証アプリに表示された6桁コード"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            {verifyMutation.isError ? (
              <Txt size="sm" color={colors.danger}>
                {(verifyMutation.error as ApiError)?.message ?? '確認できませんでした'}
              </Txt>
            ) : null}
            <Button
              title="有効にする"
              onPress={submitVerify}
              loading={verifyMutation.isPending}
              disabled={code.trim().length !== 6}
            />
          </View>
        </Card>
      ) : null}

      {step === 'recovery-codes' ? (
        <Card style={{ gap: space.md }}>
          <Txt weight="bold">リカバリコード（大切に保管してください）</Txt>
          <Txt size="sm" color={colors.textSub}>
            認証アプリが使えない場合、この10個のコードのいずれかでログインできます。1コードにつき1回のみ使用できます。
          </Txt>
          <View style={{ gap: space.xs }}>
            {recoveryCodes.map((c) => (
              <Txt key={c} weight="bold" selectable style={{ fontFamily: 'monospace' }}>
                {c}
              </Txt>
            ))}
          </View>
          <Button title="確認しました" onPress={() => setStep('idle')} />
        </Card>
      ) : null}

      {user?.twoFactorEnabled && step === 'idle' ? (
        <Card style={{ gap: space.md }}>
          <Txt weight="bold">2段階認証を無効にする</Txt>
          <TextField
            label="現在の6桁コード"
            value={disableCode}
            onChangeText={setDisableCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          {disableMutation.isError ? (
            <Txt size="sm" color={colors.danger}>
              {(disableMutation.error as ApiError)?.message ?? '無効化できませんでした'}
            </Txt>
          ) : null}
          <Button
            title="無効にする"
            variant="danger"
            onPress={submitDisable}
            loading={disableMutation.isPending}
            disabled={disableCode.trim().length !== 6}
          />
        </Card>
      ) : null}
    </ScrollView>
  )
}
