/** QueryClient と永続化（T-04-4 / 8-1 オフラインキャッシュ） */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '../api/client'
import { PERSISTED_KEY_ROOTS } from './keys'

/** 補-8-1-2: キャッシュ TTL 24時間 */
export const OFFLINE_CACHE_TTL_MS = 24 * 60 * 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: OFFLINE_CACHE_TTL_MS,
      retry: (failureCount, error) => {
        // 通信不能・4xx はリトライしない（電波の悪い会場での無駄な再試行を避ける）
        if (error instanceof ApiError) {
          if (error.isNetwork) return false
          if (error.status >= 400 && error.status < 500) return false
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      // 補-8-1-3: 書き込みはオフラインキューを持たず、その場で失敗させる
      retry: false,
      networkMode: 'always',
    },
  },
})

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'jtour.query-cache',
  throttleTime: 2000,
})

/** 参照系のうち PERSISTED_KEY_ROOTS に含まれるものだけ永続化する（補-8-1-1） */
export const shouldDehydrateQuery = (query: { queryKey: readonly unknown[]; state: { status: string } }) => {
  if (query.state.status !== 'success') return false
  const root = query.queryKey[0]
  return typeof root === 'string' && PERSISTED_KEY_ROOTS.has(root)
}
