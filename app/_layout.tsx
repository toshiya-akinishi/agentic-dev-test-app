/** ルートレイアウト（T-04-1, T-04-2, T-04-4, T-04-5, T-04-7） */
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { router, Stack, usePathname } from 'expo-router'
import { Provider as JotaiProvider, useAtomValue, useSetAtom } from 'jotai'
import React, { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'

import { setAuthSupplier } from '../src/api/client'
import { EmergencyBanner } from '../src/components/EmergencyBanner'
import { LoginPromptSheet } from '../src/features/auth'
import { setAnalyticsIdentity, setAnalyticsOnline, startAnalytics, trackScreenView } from '../src/lib/analytics'
import { OFFLINE_CACHE_TTL_MS, persister, queryClient, shouldDehydrateQuery } from '../src/queries/client'
import {
  authReadyAtom,
  authUserAtom,
  deviceIdAtom,
  ensureDeviceId,
  loadGuestOnboardingDone,
  loadToken,
  tokenAtom,
  type AuthUser,
} from '../src/store/auth'
import { isOfflineAtom } from '../src/store/network'
import { useAppFocusManager, useNetworkWatcher } from '../src/lib/network'
import { colors } from '../src/theme'

/** T-15-7 / 補-8-7-2: 画面遷移のたびに screen_view を自動送信する */
const ScreenViewTracker = () => {
  const pathname = usePathname()
  useEffect(() => {
    trackScreenView(pathname)
  }, [pathname])
  return null
}

/** 起動時の認証・deviceId 復元（補-6-1-1） */
const Bootstrap = ({ children }: { children: React.ReactNode }) => {
  const setToken = useSetAtom(tokenAtom)
  const setDeviceId = useSetAtom(deviceIdAtom)
  const setUser = useSetAtom(authUserAtom)
  const setReady = useSetAtom(authReadyAtom)
  const [state, setState] = useState<{ token?: string; deviceId?: string }>({})
  const user = useAtomValue(authUserAtom)
  const isOffline = useAtomValue(isOfflineAtom)

  useNetworkWatcher()
  useAppFocusManager()

  // API クライアントへ token / deviceId を供給する（循環参照を避けるため関数注入）
  useEffect(() => {
    setAuthSupplier(() => state)
  }, [state])

  // T-15-4, 5: 計測クライアントへ識別子とオンライン状態を供給する
  useEffect(() => {
    setAnalyticsIdentity({ deviceId: state.deviceId, userId: user?.id })
  }, [state.deviceId, user])
  useEffect(() => {
    setAnalyticsOnline(!isOffline)
  }, [isOffline])
  useEffect(() => {
    startAnalytics()
  }, [])

  useEffect(() => {
    let mounted = true
    void (async () => {
      const deviceId = await ensureDeviceId()
      const token = (await loadToken()) ?? undefined
      if (!mounted) return

      setDeviceId(deviceId)
      setToken(token ?? null)
      setState({ token, deviceId })
      setAuthSupplier(() => ({ token, deviceId }))

      let restoredUser: AuthUser | null = null
      if (token) {
        try {
          const res = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/users/me`,
            { headers: { Authorization: `JWT ${token}` } },
          )
          const json = (await res.json()) as { user?: AuthUser | null }
          if (mounted && json?.user) {
            restoredUser = json.user
            setUser(json.user)
          }
        } catch {
          // 起動時にサーバへ到達できなくてもアプリは使える（8-1）
        }
      }
      if (mounted) setReady(true)

      // 6-12 / 補-6-12-1: 初回起動時のオンボーディング（未完了ならログイン有無に関わらず表示）
      const onboardingDone = restoredUser
        ? Boolean(restoredUser.onboardingCompleted)
        : await loadGuestOnboardingDone()
      if (mounted && !onboardingDone) router.push('/onboarding')
    })()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <JotaiProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              persister,
              maxAge: OFFLINE_CACHE_TTL_MS,
              dehydrateOptions: { shouldDehydrateQuery },
            }}
          >
            <Bootstrap>
              <StatusBar style="dark" />
              <ScreenViewTracker />
              <EmergencyBanner />
              <LoginPromptSheet />
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: colors.bg },
                  headerTitleStyle: { fontSize: 17, fontWeight: '700', color: colors.text },
                  headerTintColor: colors.primary,
                  contentStyle: { backgroundColor: colors.bg },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'modal' }} />
              </Stack>
            </Bootstrap>
          </PersistQueryClientProvider>
        </JotaiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
