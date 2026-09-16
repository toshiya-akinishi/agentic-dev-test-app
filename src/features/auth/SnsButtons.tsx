/**
 * SNS 連携ボタン（T-05-5 / 補-6-4-1・ADR: 6-4 は MOCK レベル）。
 *
 * Google / Apple / LINE の実 OAuth は行わず、開発用の疑似ピッカー（アカウント名・メール欄）で
 * 「連携できた体」を作ってから `POST /api/auth/social/:provider` を実際に叩く。
 * このエンドポイントは cms 側にまだ無いため、実装されるまでは 404 になる
 * （疑似連携の境界だけを実装し、スタブ応答は cms 側が用意する想定 — 00-project-overview.md 3章の MOCK 定義）。
 */
import React, { useState } from 'react'
import { View } from 'react-native'

import { Button, Sheet, Txt, TextField } from '../../components/ui'
import { useSocialLinkMutation, useSocialLoginMutation } from '../../queries/auth'
import type { SocialProvider } from '../../api/auth'
import { colors, space } from '../../theme'

const PROVIDER_LABEL: Record<SocialProvider, { label: string; emoji: string; defaultEmail: string }> = {
  google: { label: 'Google', emoji: '🔴', defaultEmail: 'test.google@example.com' },
  apple: { label: 'Apple', emoji: '⚫️', defaultEmail: 'test.apple@example.com' },
  line: { label: 'LINE', emoji: '🟢', defaultEmail: 'test.line@example.com' },
}

/** ログイン/新規登録画面用（ワンステップ登録・6-4） */
export const SnsLoginButtons = () => (
  <SnsButtonsBase mode="login" title="SNSアカウントでログイン" />
)

/** マイページのプロフィール編集用（連携済みアカウントの追加） */
export const SnsLinkButtons = () => (
  <SnsButtonsBase mode="link" title="SNS連携を追加" />
)

const SnsButtonsBase = ({ mode, title }: { mode: 'login' | 'link'; title: string }) => {
  const [active, setActive] = useState<SocialProvider | null>(null)
  const [name, setName] = useState('テストユーザー')
  const [email, setEmail] = useState('')

  const loginMutation = useSocialLoginMutation()
  const linkMutation = useSocialLinkMutation()
  const mutation = mode === 'login' ? loginMutation : linkMutation

  const open = (provider: SocialProvider) => {
    setActive(provider)
    setEmail(PROVIDER_LABEL[provider].defaultEmail)
    mutation.reset()
  }
  const close = () => setActive(null)

  const submit = () => {
    if (!active) return
    mutation.mutate(
      { provider: active, fakeEmail: email, fakeName: name },
      { onSuccess: close },
    )
  }

  return (
    <View style={{ gap: space.sm }}>
      <Txt size="sm" color={colors.textSub}>
        {title}
      </Txt>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {(Object.keys(PROVIDER_LABEL) as SocialProvider[]).map((p) => (
          <Button
            key={p}
            title={`${PROVIDER_LABEL[p].emoji} ${PROVIDER_LABEL[p].label}`}
            variant="ghost"
            onPress={() => open(p)}
            style={{ flex: 1 }}
          />
        ))}
      </View>

      <Sheet visible={active !== null} onClose={close}>
        {active ? (
          <View style={{ gap: space.md }}>
            <Txt size="lg" weight="bold">
              {PROVIDER_LABEL[active].emoji} {PROVIDER_LABEL[active].label} 連携（開発用スタブ）
            </Txt>
            <Txt size="sm" color={colors.textSub}>
              実際の {PROVIDER_LABEL[active].label} 認可画面は開きません。開発用に下記のアカウント情報で疑似連携します（T-05-5 / MOCK）。
            </Txt>
            <TextField label="表示名" value={name} onChangeText={setName} />
            <TextField
              label="メールアドレス"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {mutation.isError ? (
              <Txt size="sm" color={colors.danger}>
                {(mutation.error as { message?: string })?.message ?? '連携できませんでした'}
              </Txt>
            ) : null}
            <Button
              title={mode === 'login' ? '疑似ログイン' : '疑似連携する'}
              onPress={submit}
              loading={mutation.isPending}
            />
            <Button title="キャンセル" variant="ghost" onPress={close} />
          </View>
        ) : null}
      </Sheet>
    </View>
  )
}
