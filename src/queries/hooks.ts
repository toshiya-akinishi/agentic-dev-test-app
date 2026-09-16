/**
 * 汎用データ取得フック（T-04-4）。
 * 各機能はこれを土台にドメイン別フックを `src/queries/<domain>.ts` に書く。
 * 画面コンポーネントから直接 `fetch` / `request` を呼ばない。
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { useAtomValue } from 'jotai'

import {
  createDoc,
  deleteDoc,
  getCustom,
  getDoc,
  getGlobal,
  listCollection,
  request,
  updateDoc,
  type PaginatedResponse,
} from '../api/client'
import type { ListParams } from '../api/query'
import { pollIntervalAtom } from '../store/network'

/** コレクション一覧 */
export const useList = <T>(
  key: readonly unknown[],
  collection: string,
  params: ListParams = {},
  options?: Partial<UseQueryOptions<PaginatedResponse<T>>>,
) =>
  useQuery<PaginatedResponse<T>>({
    queryKey: key,
    queryFn: () => listCollection<T>(collection, params),
    ...options,
  })

/** コレクション単体 */
export const useDoc = <T>(
  key: readonly unknown[],
  collection: string,
  id: string | undefined,
  depth = 1,
  options?: Partial<UseQueryOptions<T>>,
) =>
  useQuery<T>({
    queryKey: key,
    queryFn: () => getDoc<T>(collection, id as string, depth),
    enabled: Boolean(id),
    ...options,
  })

/** 無限スクロール（補-2-8-2, 補-1-9-1 など 20件/ページ） */
export const useInfiniteList = <T>(
  key: readonly unknown[],
  collection: string,
  params: ListParams = {},
  options?: { enabled?: boolean; limit?: number },
) => {
  const limit = options?.limit ?? 20
  return useInfiniteQuery<PaginatedResponse<T>>({
    queryKey: key,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listCollection<T>(collection, { ...params, limit, page: pageParam as number }),
    getNextPageParam: (last) => (last.hasNextPage ? last.nextPage : undefined),
    enabled: options?.enabled ?? true,
  })
}

/** 無限スクロールの結果を 1 本の配列に潰す */
export const flattenPages = <T>(data?: { pages: PaginatedResponse<T>[] }): T[] =>
  data?.pages.flatMap((p) => p.docs) ?? []

/** global（設定系）の取得。例: `app-settings` / `legal-documents`（6-15） */
export const useGlobal = <T>(
  key: readonly unknown[],
  slug: string,
  depth = 1,
  options?: Partial<UseQueryOptions<T>>,
) =>
  useQuery<T>({
    queryKey: key,
    queryFn: () => getGlobal<T>(slug, depth),
    ...options,
  })

/** カスタムエンドポイント（docs/03-api-spec.md 3章） */
export const useCustom = <T>(
  key: readonly unknown[],
  path: string,
  search?: Record<string, string | number | undefined>,
  options?: Partial<UseQueryOptions<T>>,
) =>
  useQuery<T>({
    queryKey: key,
    queryFn: () => getCustom<T>(path, search),
    ...options,
  })

/**
 * ライブ更新つきクエリ（補-3-1-2 / 補-1-5-2 / 補-1-31-1）。
 * `live` が false のときはポーリングしない。低速時は自動で間隔が延びる（補-8-2-1）。
 */
export const useLiveQuery = <T>(
  key: readonly unknown[],
  fetcher: () => Promise<T>,
  live: boolean,
  options?: { intervalMs?: number; enabled?: boolean } & Partial<UseQueryOptions<T>>,
) => {
  const autoInterval = useAtomValue(pollIntervalAtom)
  const interval = options?.intervalMs ?? (autoInterval === false ? false : autoInterval)

  return useQuery<T>({
    queryKey: key,
    queryFn: fetcher,
    refetchInterval: live && interval !== false ? interval : false,
    refetchOnMount: true,
    // バックグラウンド復帰時に即時再取得（補-3-1-2）
    refetchOnWindowFocus: live,
    staleTime: live ? 0 : 60_000,
    enabled: options?.enabled ?? true,
    ...options,
  })
}

/** 書き込み系。補-8-1-3 によりオフラインキューは持たない */
export const useApiMutation = <TData, TVars>(
  fn: (vars: TVars) => Promise<TData>,
  options?: UseMutationOptions<TData, unknown, TVars>,
) => useMutation<TData, unknown, TVars>({ mutationFn: fn, ...options })

export { request, getCustom, listCollection, getDoc, createDoc, updateDoc, deleteDoc, useQueryClient }
export type { PaginatedResponse }
