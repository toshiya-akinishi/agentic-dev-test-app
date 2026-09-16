/**
 * 書き込み系ミューテーションの失敗フィードバック（補-8-1-3）。
 * オフラインキューは持たず、その場で失敗させたうえで「オフラインのため実行できません」等の
 * 分かりやすいメッセージを出す（無言で失敗させない）。
 */
import { Alert } from 'react-native'

import { ApiError } from '../api/client'

export const mutationErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.isNetwork) return 'オフラインのため実行できません。電波の良い場所で再度お試しください。'
    return error.message
  }
  return '操作に失敗しました。もう一度お試しください。'
}

/** いいね・お気に入りなど、自己完結ボタンからの失敗通知に使う */
export const alertMutationError = (error: unknown, title = '実行できませんでした') => {
  Alert.alert(title, mutationErrorMessage(error))
}
