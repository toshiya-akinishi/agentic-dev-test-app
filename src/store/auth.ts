/** 認証・デバイスID の状態（T-04-5, T-04-7） */
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'
import { atom } from 'jotai'
import { Platform } from 'react-native'

export type AuthUser = {
  id: string | number
  email: string
  displayName: string
  role: 'admin' | 'editor' | 'operator' | 'sponsor' | 'fan'
  onboardingCompleted?: boolean
  notificationMaster?: boolean
  /** 6-2 / 補-6-2-2 */
  twoFactorEnabled?: boolean
  /** 補-6-15-2: 同意済みの利用規約バージョン */
  agreedTermsVersion?: string | null
}

const TOKEN_KEY = 'jtour.auth.token'
const DEVICE_KEY = 'jtour.device.id'
/** ゲスト（未ログイン）時のオンボーディング完了状態（補-6-12-2） */
const GUEST_ONBOARDING_KEY = 'jtour.onboarding.completed'

/** SecureStore は Web で使えないため AsyncStorage にフォールバックする */
const secureGet = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key)
  try {
    return await SecureStore.getItemAsync(key)
  } catch {
    return AsyncStorage.getItem(key)
  }
}

const secureSet = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') return AsyncStorage.setItem(key, value)
  try {
    await SecureStore.setItemAsync(key, value)
  } catch {
    await AsyncStorage.setItem(key, value)
  }
}

const secureDelete = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') return AsyncStorage.removeItem(key)
  try {
    await SecureStore.deleteItemAsync(key)
  } catch {
    await AsyncStorage.removeItem(key)
  }
}

export const loadToken = () => secureGet(TOKEN_KEY)
export const saveToken = (t: string) => secureSet(TOKEN_KEY, t)
export const clearToken = () => secureDelete(TOKEN_KEY)

/**
 * デバイスID（補-6-1-1）。
 * 未ログインでもお気に入り・いいね・通知設定を保持するための識別子。
 */
export const ensureDeviceId = async (): Promise<string> => {
  const existing = await secureGet(DEVICE_KEY)
  if (existing) return existing
  const id = Crypto.randomUUID()
  await secureSet(DEVICE_KEY, id)
  return id
}

export const tokenAtom = atom<string | null>(null)
export const deviceIdAtom = atom<string | null>(null)
export const authUserAtom = atom<AuthUser | null>(null)
/** 起動時の認証復元が終わったか */
export const authReadyAtom = atom(false)

export const isLoggedInAtom = atom((get) => get(authUserAtom) !== null)
/** ゲスト＝未ログイン（6-1）。機能制限の判定に使う */
export const isGuestAtom = atom((get) => get(authUserAtom) === null)

/**
 * ログイン試行の途中経過（補-6-2-2: 2段階認証）。
 * `POST /api/users/login` が成功しても `user.twoFactorEnabled` が true の場合は
 * この atom に一時保持し、TOTP コード検証が完了するまで `tokenAtom` / `authUserAtom` へは反映しない。
 */
export type PendingTwoFactor = { pendingToken: string; user: AuthUser }
export const pendingTwoFactorAtom = atom<PendingTwoFactor | null>(null)

/**
 * ログイン誘導シート（T-05-3 / 補-6-1-2, 補-6-1-3）の開閉状態。
 * ゲストが制限機能に触れたときにどの画面からでも `openLoginPromptAtom` 経由で開ける。
 */
export type LoginPromptState = { open: boolean; reason?: string; redirectTo?: string }
export const loginPromptAtom = atom<LoginPromptState>({ open: false })

/** ゲストのオンボーディング完了状態（補-6-12-2）。ログイン中は `authUserAtom.onboardingCompleted` を使う */
export const loadGuestOnboardingDone = async (): Promise<boolean> =>
  (await AsyncStorage.getItem(GUEST_ONBOARDING_KEY)) === '1'

export const saveGuestOnboardingDone = async (): Promise<void> => {
  await AsyncStorage.setItem(GUEST_ONBOARDING_KEY, '1')
}

export const guestOnboardingDoneAtom = atom(false)
