/**
 * ログイン誘導シート（T-05-3 / 補-6-1-2, 補-6-1-3）。
 * `app/_layout.tsx` にマウントし、`loginPromptAtom` を経由してどの画面からでも開ける。
 */
import { router } from 'expo-router'
import { useAtom } from 'jotai'
import React from 'react'
import { View } from 'react-native'

import { Button, Sheet, Txt } from '../../components/ui'
import { loginPromptAtom } from '../../store/auth'
import { colors, space } from '../../theme'

export const LoginPromptSheet = () => {
  const [state, setState] = useAtom(loginPromptAtom)
  const close = () => setState({ open: false })

  const go = (path: '/auth/login' | '/auth/register') => {
    close()
    router.push(path)
  }

  return (
    <Sheet visible={state.open} onClose={close}>
      <Txt size="lg" weight="bold">
        ログインが必要です
      </Txt>
      <Txt color={colors.textSub} size="sm" style={{ marginTop: space.sm, marginBottom: space.xl }}>
        {state.reason ?? 'この機能を利用するにはログインまたは新規登録が必要です。'}
      </Txt>
      <View style={{ gap: space.md }}>
        <Button title="ログイン" onPress={() => go('/auth/login')} />
        <Button title="新規登録" variant="secondary" onPress={() => go('/auth/register')} />
        <Button title="あとで" variant="ghost" onPress={close} />
      </View>
    </Sheet>
  )
}
