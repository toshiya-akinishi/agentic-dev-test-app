/**
 * 認証・アカウント管理のデータ取得/更新フック（EP-05）。
 * 画面からは必ずこのフック経由で呼ぶ（AGENTS.md 3章）。
 */
import { useQueryClient } from '@tanstack/react-query'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback } from 'react'

import {
  forgotPasswordRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
  resetPasswordRequest,
  socialAuthRequest,
  totpDisableRequest,
  totpEnrollRequest,
  totpLoginRecoveryRequest,
  totpLoginVerifyRequest,
  totpVerifyRequest,
  updateProfileRequest,
  withdrawRequest,
  guestMergeRequest,
  type AuthResponse,
  type SocialProvider,
} from '../api/auth'
import { createDoc, setAuthSupplier } from '../api/client'
import {
  authUserAtom,
  clearToken,
  deviceIdAtom,
  pendingTwoFactorAtom,
  saveToken,
  tokenAtom,
  type AuthUser,
} from '../store/auth'
import { useApiMutation, useCustom, useGlobal, useList } from './hooks'
import { qk, USER_SCOPED_KEY_ROOTS } from './keys'
import type { Faq, Inquiry, LegalDocument, OnboardingSlide, User } from '../types/payload'

const toAuthUser = (u: AuthResponse['user']): AuthUser => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  role: u.role,
  onboardingCompleted: u.onboardingCompleted ?? false,
  notificationMaster: u.notificationMaster ?? true,
  twoFactorEnabled: u.twoFactorEnabled ?? false,
  agreedTermsVersion: u.agreedTermsVersion ?? null,
})

/**
 * ログイン確定処理（補-6-1-1 / T-05-2, T-05-4）。
 * トークン永続化・Jotai 反映に加え、ゲストの端末データ移行（`/api/guest/merge`）まで行う。
 * merge は cms 側が未実装のため失敗しても無視し、ログイン自体は成立させる。
 */
export const useCompleteAuth = () => {
  const setToken = useSetAtom(tokenAtom)
  const setUser = useSetAtom(authUserAtom)
  const setPending = useSetAtom(pendingTwoFactorAtom)
  const deviceId = useAtomValue(deviceIdAtom)
  const queryClient = useQueryClient()

  return useCallback(
    async (res: AuthResponse) => {
      await saveToken(res.token)
      setToken(res.token)
      setAuthSupplier(() => ({ token: res.token, deviceId: deviceId ?? undefined }))
      setUser(toAuthUser(res.user))
      setPending(null)

      if (deviceId) {
        try {
          await guestMergeRequest(deviceId, res.token)
        } catch {
          // T-05-4: cms 側 `/api/guest/merge` は未実装。想定内のギャップとして無視する
        }
      }
      // ゲスト鍵→ユーザー鍵に切り替わるため、端末スコープのデータを再取得させる
      for (const root of ['favorites', 'likes', 'notification-settings', 'device-tokens', 'playlists']) {
        void queryClient.invalidateQueries({ queryKey: [root] })
      }
    },
    [deviceId, queryClient, setPending, setToken, setUser],
  )
}

/** 6-2: ログイン。2段階認証有効時は `requiresTwoFactor: true` を返し、`pendingTwoFactorAtom` に控える */
export const useLoginMutation = () => {
  const complete = useCompleteAuth()
  const setPending = useSetAtom(pendingTwoFactorAtom)

  return useApiMutation(async (vars: { email: string; password: string }) => {
    const res = await loginRequest(vars.email, vars.password)
    if (res.user.twoFactorEnabled) {
      setPending({ pendingToken: res.token, user: toAuthUser(res.user) })
      return { requiresTwoFactor: true as const }
    }
    await complete(res)
    return { requiresTwoFactor: false as const }
  })
}

/** 補-6-2-2: ログイン2段階目の TOTP コード検証 */
export const useTotpLoginVerifyMutation = () => {
  const complete = useCompleteAuth()
  const pending = useAtomValue(pendingTwoFactorAtom)
  return useApiMutation(async (code: string) => {
    if (!pending) throw new Error('ログイン情報の有効期限が切れました。もう一度ログインしてください。')
    const res = await totpLoginVerifyRequest(pending.pendingToken, code)
    await complete(res)
  })
}

/** 補-6-2-2: TOTP アプリが使えない場合のリカバリコードでのログイン */
export const useTotpLoginRecoveryMutation = () => {
  const complete = useCompleteAuth()
  const pending = useAtomValue(pendingTwoFactorAtom)
  return useApiMutation(async (recoveryCode: string) => {
    if (!pending) throw new Error('ログイン情報の有効期限が切れました。もう一度ログインしてください。')
    const res = await totpLoginRecoveryRequest(pending.pendingToken, recoveryCode)
    await complete(res)
  })
}

/** 6-4 / 補-6-4-2: ワンステップ登録（email + password + 表示名） */
export const useRegisterMutation = () => {
  const complete = useCompleteAuth()
  return useApiMutation(
    async (vars: { email: string; password: string; displayName: string; agreedTermsVersion?: string }) => {
      await registerRequest(vars)
      const res = await loginRequest(vars.email, vars.password)
      await complete(res)
    },
  )
}

/** 6-6 / 補-6-6-1: ログアウト。トークン破棄 + ユーザー固有キャッシュのみクリア */
export const useLogout = () => {
  const setToken = useSetAtom(tokenAtom)
  const setUser = useSetAtom(authUserAtom)
  const token = useAtomValue(tokenAtom)
  const deviceId = useAtomValue(deviceIdAtom)
  const queryClient = useQueryClient()

  return useCallback(async () => {
    try {
      await logoutRequest(token ?? undefined)
    } catch {
      // 補-6-6-1: オフラインでもローカルのログアウトは成立させる
    }
    await clearToken()
    setToken(null)
    setUser(null)
    setAuthSupplier(() => ({ token: undefined, deviceId: deviceId ?? undefined }))
    queryClient.removeQueries({
      predicate: (q) => {
        const root = q.queryKey[0]
        return typeof root === 'string' && USER_SCOPED_KEY_ROOTS.has(root)
      },
    })
  }, [deviceId, queryClient, setToken, setUser, token])
}

/** 補-6-8-1 */
export const useForgotPasswordMutation = () => useApiMutation((email: string) => forgotPasswordRequest(email))

/** 補-6-8-1: 新パスワード確定。成功時はそのままログイン状態にする */
export const useResetPasswordMutation = () => {
  const complete = useCompleteAuth()
  return useApiMutation(async (vars: { token: string; password: string }) => {
    const res = await resetPasswordRequest(vars.token, vars.password)
    await complete(res)
  })
}

/**
 * 6-3 / 6-5: マイページのプロフィール詳細表示用（`GET /api/users/me`、標準 REST）。
 * `authUserAtom` は最小限の項目のみ保持するため、住所・SNS連携・使用クラブ等の全項目編集には
 * このフックでフル doc を取得する。
 */
export const useMyProfile = () => {
  const token = useAtomValue(tokenAtom)
  return useCustom<{ user: User }>(qk.me(), '/api/users/me', undefined, { enabled: Boolean(token) })
}

/** 6-3 / 6-5: プロフィール登録・修正（標準 `PATCH /api/users/:id`） */
export const useUpdateProfileMutation = () => {
  const user = useAtomValue(authUserAtom)
  const token = useAtomValue(tokenAtom)
  const setUser = useSetAtom(authUserAtom)
  const queryClient = useQueryClient()

  return useApiMutation(
    async (patch: Record<string, unknown>) => {
      if (!user) throw new Error('ログインが必要です')
      const updated = await updateProfileRequest(user.id, patch, token ?? undefined)
      setUser({ ...user, ...toAuthUser(updated) })
      return updated
    },
    { onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.me() }) },
  )
}

/** 6-7 / 補-6-7-1: 退会（パスワード再確認込み） */
export const useWithdrawMutation = () => {
  const token = useAtomValue(tokenAtom)
  return useApiMutation((password: string) => withdrawRequest(password, token ?? undefined))
}

/* ---------------- 2FA（T-05-6 / 補-6-2-2） ---------------- */

export const useTotpEnrollMutation = () => {
  const token = useAtomValue(tokenAtom)
  return useApiMutation(() => totpEnrollRequest(token ?? undefined))
}

export const useTotpVerifyMutation = () => {
  const token = useAtomValue(tokenAtom)
  const user = useAtomValue(authUserAtom)
  const setUser = useSetAtom(authUserAtom)
  return useApiMutation(async (code: string) => {
    const res = await totpVerifyRequest(code, token ?? undefined)
    if (user) setUser({ ...user, twoFactorEnabled: true })
    return res
  })
}

export const useTotpDisableMutation = () => {
  const token = useAtomValue(tokenAtom)
  const user = useAtomValue(authUserAtom)
  const setUser = useSetAtom(authUserAtom)
  return useApiMutation(async (code: string) => {
    await totpDisableRequest(code, token ?? undefined)
    if (user) setUser({ ...user, twoFactorEnabled: false })
  })
}

/* ---------------- SNS 連携（T-05-5 / MOCK） ---------------- */

export const useSocialLoginMutation = () => {
  const complete = useCompleteAuth()
  return useApiMutation(async (vars: { provider: SocialProvider; fakeEmail: string; fakeName: string }) => {
    const res = await socialAuthRequest(vars.provider, {
      mode: 'login',
      fakeEmail: vars.fakeEmail,
      fakeName: vars.fakeName,
    })
    await complete(res)
  })
}

export const useSocialLinkMutation = () => {
  const token = useAtomValue(tokenAtom)
  const queryClient = useQueryClient()
  return useApiMutation(
    (vars: { provider: SocialProvider; fakeEmail: string; fakeName: string }) =>
      socialAuthRequest(
        vars.provider,
        { mode: 'link', fakeEmail: vars.fakeEmail, fakeName: vars.fakeName },
        token ?? undefined,
      ),
    { onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.me() }) },
  )
}

/* ---------------- FAQ / 規約 / オンボーディング / お問い合わせ ---------------- */

/** 6-13 / 補-6-13-1 */
export const useFaqs = () =>
  useList<Faq>(qk.faqs(), 'faqs', { sort: 'category,order', limit: 200 })

/** 6-12 / 補-6-12-1 */
export const useOnboardingSlides = () =>
  useList<OnboardingSlide>(qk.onboardingSlides(), 'onboarding-slides', { sort: 'order', limit: 20 })

/** 6-15 / 補-6-15-1 */
export const useLegalDocuments = () => useGlobal<LegalDocument>(qk.legalDocuments(), 'legal-documents', 0)

/** 補-6-14-1, 2: お問い合わせ送信（標準 `POST /api/inquiries`） */
export const useSubmitInquiry = () =>
  useApiMutation((body: {
    name: string
    email: string
    category: Inquiry['category']
    body: string
    deviceId?: string
  }) => createDoc<Inquiry>('inquiries', { ...body, status: 'open' }))
