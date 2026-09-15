/** ルートレイアウト（T-04-1, T-04-2, T-04-4, T-04-5, T-04-7） */
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { Stack } from 'expo-router'
import { Provider as JotaiProvider, useSetAtom } from 'jotai'
import React, { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'

import { setAuthSupplier } from '../src/api/client'
import { EmergencyBanner } from '../src/components/EmergencyBanner'
import { OFFLINE_CACHE_TTL_MS, persister, queryClient, shouldDehydrateQuery } from '../src/queries/client'
import {
  authReadyAtom,
  authUserAtom,
  deviceIdAtom,
  ensureDeviceId,
  loadToken,
  tokenAtom,
  type AuthUser,
} from '../src/store/auth'
import { useNetworkWatcher } from '../src/lib/network'
import { colors } from '../src/theme'

/** 起動時の認証・deviceId 復元（補-6-1-1） */
const Bootstrap = ({ children }: { children: React.ReactNode }) => {
  const setToken = useSetAtom(tokenAtom)
  const setDeviceId = useSetAtom(deviceIdAtom)
  const setUser = useSetAtom(authUserAtom)
  const setReady = useSetAtom(authReadyAtom)
  const [state, setState] = useState<{ token?: string; deviceId?: string }>({})

  useNetworkWatcher()

  // API クライアントへ token / deviceId を供給する（循環参照を避けるため関数注入）
  useEffect(() => {
    setAuthSupplier(() => state)
  }, [state])

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

      if (token) {
        try {
          const res = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/users/me`,
            { headers: { Authorization: `JWT ${token}` } },
          )
          const json = (await res.json()) as { user?: AuthUser | null }
          if (mounted && json?.user) setUser(json.user)
        } catch {
          // 起動時にサーバへ到達できなくてもアプリは使える（8-1）
        }
      }
      if (mounted) setReady(true)
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
              <EmergencyBanner />
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
