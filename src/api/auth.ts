/**
 * 認証・アカウント管理 API（EP-05 / docs/03-api-spec.md 2章）。
 *
 * `/api/users/*` は Payload の `auth: true` コレクションが自動生成する標準 REST
 * （制約1）。`/api/guest/merge` `/api/auth/2fa/*` `/api/auth/social/*`
 * `/api/users/me/delete` は cms 側にまだ実装されていないカスタムエンドポイントで、
 * 実装されるまで 404 になる（想定内・許容されたギャップ）。
 */
import { request } from './client'
import type { User } from '../types/payload'

export type AuthResponse = { message?: string; user: User; token: string; exp?: number }

/* ---------------- 標準 REST（既に動作する） ---------------- */

/** 6-2 */
export const loginRequest = (email: string, password: string) =>
  request<AuthResponse>('/api/users/login', { method: 'POST', body: { email, password } })

/** 6-4 / 補-6-4-2: ワンステップ登録（email + password + 表示名のみ必須） */
export const registerRequest = (body: {
  email: string
  password: string
  displayName: string
  /** 補-6-15-2 */
  agreedTermsVersion?: string
}) => request<{ message?: string; doc: User }>('/api/users', { method: 'POST', body })

/** 6-6 */
export const logoutRequest = (token?: string) =>
  request<{ message?: string }>('/api/users/logout', { method: 'POST', token })

export const meRequest = (token?: string) => request<{ user: User | null }>('/api/users/me', { token })

/** 補-6-8-1: メール送信は開発時コンソール出力（cms 側 MOCK） */
export const forgotPasswordRequest = (email: string) =>
  request<{ message?: string }>('/api/users/forgot-password', {
    method: 'POST',
    body: { email },
  })

/** 補-6-8-1: トークン有効期限 1 時間 */
export const resetPasswordRequest = (token: string, password: string) =>
  request<AuthResponse>('/api/users/reset-password', { method: 'POST', body: { token, password } })

/** 6-3 / 6-5: プロフィールの登録・修正（標準の users コレクション PATCH） */
export const updateProfileRequest = (id: string | number, patch: Record<string, unknown>, token?: string) =>
  request<User>(`/api/users/${id}`, { method: 'PATCH', body: patch, token })

/* ---------------- カスタムエンドポイント（cms 未実装。404 は想定内） ---------------- */

/** 6-1 / 補-6-1-1: ゲストデータのユーザー移行 */
export const guestMergeRequest = (deviceId: string, token?: string) =>
  request<{ message?: string; merged?: Record<string, number> }>('/api/guest/merge', {
    method: 'POST',
    body: { deviceId },
    token,
  })

/** 6-7 / 補-6-7-1: 退会（論理削除＋関連削除、注文は匿名化） */
export const withdrawRequest = (password: string, token?: string) =>
  request<{ message?: string }>('/api/users/me/delete', {
    method: 'POST',
    body: { password },
    token,
  })

/** 補-6-2-2: TOTP シークレット + QR 発行 */
export type TotpEnrollResponse = { secret: string; otpauthUrl?: string }
export const totpEnrollRequest = (token?: string) =>
  request<TotpEnrollResponse>('/api/auth/2fa/enroll', { method: 'POST', token })

/** 補-6-2-2: TOTP 検証・有効化。成功時にリカバリコード 10 個を返す */
export type TotpVerifyResponse = { recoveryCodes: string[] }
export const totpVerifyRequest = (code: string, token?: string) =>
  request<TotpVerifyResponse>('/api/auth/2fa/verify', { method: 'POST', body: { code }, token })

/** 補-6-2-2: 2FA 無効化（現在の TOTP コードを再確認してから解除する） */
export const totpDisableRequest = (code: string, token?: string) =>
  request<{ message?: string }>('/api/auth/2fa/disable', {
    method: 'POST',
    body: { code },
    token,
  })

/**
 * ログイン2段階目の TOTP 検証。
 * `docs/03-api-spec.md` には未記載のため、この app 実装が期待する新規契約として
 * 最終報告で CMS 側に申し送りする（enroll/verify とは別に、ログイン時専用のエンドポイントが要る）。
 */
export const totpLoginVerifyRequest = (pendingToken: string, code: string) =>
  request<AuthResponse>('/api/auth/2fa/login-verify', {
    method: 'POST',
    body: { pendingToken, code },
  })

/** TOTP アプリが使えない場合のリカバリコードによるログイン */
export const totpLoginRecoveryRequest = (pendingToken: string, recoveryCode: string) =>
  request<AuthResponse>('/api/auth/2fa/login-recovery', {
    method: 'POST',
    body: { pendingToken, recoveryCode },
  })

/** 6-4 / 補-6-4-1: SNS 連携（MOCK）。スタブの認可フローが成立した体で呼ぶ */
export type SocialProvider = 'google' | 'apple' | 'line'
export const socialAuthRequest = (
  provider: SocialProvider,
  body: { mode: 'login' | 'link'; fakeEmail: string; fakeName: string },
  token?: string,
) => request<AuthResponse>(`/api/auth/social/${provider}`, { method: 'POST', body, token })
