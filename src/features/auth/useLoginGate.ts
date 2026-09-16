/** ゲスト制限機能へのアクセスを判定し、必要ならログイン誘導シートを開く（T-05-3 / 補-6-1-2） */
import { useSetAtom } from 'jotai'
import { useAtomValue } from 'jotai'
import { useCallback } from 'react'

import { isGuestAtom, loginPromptAtom } from '../../store/auth'

export const useLoginGate = () => {
  const isGuest = useAtomValue(isGuestAtom)
  const setPrompt = useSetAtom(loginPromptAtom)

  /** true を返せばそのまま処理を続けてよい。false ならシートを開いて中断させる */
  return useCallback(
    (reason?: string): boolean => {
      if (!isGuest) return true
      setPrompt({ open: true, reason })
      return false
    },
    [isGuest, setPrompt],
  )
}
