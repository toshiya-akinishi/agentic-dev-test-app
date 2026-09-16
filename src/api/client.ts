/** API クライアント（T-04-3）。エラーは ApiError に正規化する。 */
import { buildQueryString, type ListParams } from './query'

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:3000'

export class ApiError extends Error {
  status: number
  fieldErrors: Array<{ message: string; field?: string }>
  isNetwork: boolean

  constructor(
    message: string,
    status: number,
    fieldErrors: Array<{ message: string; field?: string }> = [],
    isNetwork = false,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.isNetwork = isNetwork
  }

  /** オフライン／到達不能か（8-1, 8-2 の分岐に使う） */
  get isOffline() {
    return this.isNetwork
  }
}

export type PaginatedResponse<T> = {
  docs: T[]
  totalDocs: number
  limit: number
  page: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: number | null
  prevPage: number | null
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** ゲスト識別子。補-6-1-1 により未ログイン時はこれで所有判定する */
  deviceId?: string
  token?: string
  signal?: AbortSignal
  headers?: Record<string, string>
}

/** 認証トークンと deviceId の供給元。Jotai ストアから注入する（循環参照を避けるため関数で保持） */
let authSupplier: () => { token?: string; deviceId?: string } = () => ({})

export const setAuthSupplier = (fn: () => { token?: string; deviceId?: string }) => {
  authSupplier = fn
}

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const supplied = authSupplier()
  const token = options.token ?? supplied.token
  const deviceId = options.deviceId ?? supplied.deviceId

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `JWT ${token}` } : {}),
    ...(deviceId ? { 'X-Device-Id': deviceId } : {}),
    ...options.headers,
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
      credentials: 'include',
    })
  } catch (e) {
    throw new ApiError(
      '通信できませんでした。電波状況をご確認ください。',
      0,
      [],
      true,
    )
  }

  if (res.status === 204) return undefined as T

  let json: unknown
  const text = await res.text()
  try {
    json = text ? JSON.parse(text) : undefined
  } catch {
    json = undefined
  }

  if (!res.ok) {
    const errs =
      (json as { errors?: Array<{ message: string; field?: string }> } | undefined)?.errors ?? []
    const message = errs[0]?.message ?? `エラーが発生しました (${res.status})`
    throw new ApiError(message, res.status, errs)
  }

  return json as T
}

/** コレクション一覧の取得 */
export const listCollection = <T>(collection: string, params: ListParams = {}) =>
  request<PaginatedResponse<T>>(`/api/${collection}${buildQueryString(params)}`)

/** コレクション単体の取得 */
export const getDoc = <T>(collection: string, id: string | number, depth = 1) =>
  request<T>(`/api/${collection}/${id}?depth=${depth}`)

/** global（設定系）の取得。例: `app-settings` / `legal-documents` */
export const getGlobal = <T>(slug: string, depth = 1) =>
  request<T>(`/api/globals/${slug}?depth=${depth}`)

/** コレクションへの新規作成（標準 REST）。例: `inquiries` の送信（補-6-14-1） */
export const createDoc = <T>(collection: string, body: unknown) =>
  request<{ message?: string; doc: T }>(`/api/${collection}`, { method: 'POST', body })

/** カスタムエンドポイント（docs/03-api-spec.md 3章） */
export const getCustom = <T>(path: string, search?: Record<string, string | number | undefined>) => {
  const qs = search
    ? '?' +
      Object.entries(search)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : ''
  return request<T>(`${path}${qs}`)
}

export { buildQueryString }
export type { ListParams }
