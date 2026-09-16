/**
 * 退会フロー（T-05-9 / 6-7 / 補-6-7-1, 補-6-7-2）。
 * 確認ダイアログ（削除内容の明示）→ パスワード再入力 → 実行。
 * `POST /api/users/me/delete` は cms 側未実装のカスタムエンドポイント（想定内のギャップ）。
 */
import { router, Stack } from 'expo-router'
import React, { useState } from 'react'
import { Alert, ScrollView, View } from 'react-native'

import type { ApiError } from '../../src/api/client'
import { Button, Card, TextField, Txt } from '../../src/components/ui'
import { useLogout, useWithdrawMutation } from '../../src/queries/auth'
import { colors, space } from '../../src/theme'

const DELETED_ITEMS = [
  'お気に入り選手・動画のいいね',
  '通知設定・通知履歴',
  'プッシュ通知の登録デバイス',
  '作成したプレイリスト',
]
const ANONYMIZED_ITEMS = ['チケット購入履歴（注文情報は匿名化して保持されます）', '計測用の行動ログ']

export default function WithdrawScreen() {
  const [confirmed, setConfirmed] = useState(false)
  const [password, setPassword] = useState('')
  const mutation = useWithdrawMutation()
  const logout = useLogout()

  const errorMessage = mutation.isError
    ? ((mutation.error as ApiError)?.message ?? '退会できませんでした')
    : undefined

  const submit = () => {
    mutation.mutate(password, {
      onSuccess: async () => {
        await logout()
        Alert.alert('退会が完了しました', 'ご利用ありがとうございました。', [
          { text: 'OK', onPress: () => router.replace('/') },
        ])
      },
    })
  }

  if (!confirmed) {
    return (
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
        <Stack.Screen options={{ title: '退会' }} />
        <Txt size="xxl" weight="bold">
          退会前のご確認
        </Txt>

        <Card>
          <Txt weight="bold" color={colors.danger}>
            削除される内容
          </Txt>
          {DELETED_ITEMS.map((item) => (
            <Txt key={item} size="sm" color={colors.textSub} style={{ marginTop: space.xs }}>
              ・{item}
            </Txt>
          ))}
        </Card>

        <Card>
          <Txt weight="bold">匿名化して保持される内容</Txt>
          {ANONYMIZED_ITEMS.map((item) => (
            <Txt key={item} size="sm" color={colors.textSub} style={{ marginTop: space.xs }}>
              ・{item}
            </Txt>
          ))}
        </Card>

        <Txt size="sm" color={colors.textSub}>
          アカウントは論理削除され、メールアドレスの再利用で再登録が可能になります（補-6-7-1）。
        </Txt>

        <Button title="内容を理解して続ける" variant="danger" onPress={() => setConfirmed(true)} />
        <Button title="キャンセル" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
      <Stack.Screen options={{ title: '退会' }} />
      <Txt size="xxl" weight="bold">
        パスワードを入力してください
      </Txt>
      <Txt size="sm" color={colors.textSub}>
        本人確認のため、現在のパスワードを再入力してください。
      </Txt>

      <View style={{ gap: space.md }}>
        <TextField label="現在のパスワード" value={password} onChangeText={setPassword} secureTextEntry />
        {errorMessage ? (
          <Txt size="sm" color={colors.danger}>
            {errorMessage}
          </Txt>
        ) : null}
        <Button
          title="退会する"
          variant="danger"
          onPress={submit}
          loading={mutation.isPending}
          disabled={password.length === 0}
        />
        <Button title="キャンセル" variant="ghost" onPress={() => setConfirmed(false)} />
      </View>
    </ScrollView>
  )
}
