/**
 * 計測クライアント（要求 8-6, 8-4, 8-7 / 補-8-6-1, 補-8-6-2, 補-8-4-2, 補-8-7-2 / T-15-4〜T-15-7）。
 *
 * `POST /api/analytics-events/batch` へバッチ送信する（`/api/analytics-events` ではない。
 * Payload の既定コレクションルートと衝突するため CMS 側は `/batch` に登録している）。
 *
 * - 最大 20 件 / 10 秒でバッチ送信（補-8-6-2）
 * - オフライン時は最大 200 件までメモリ + AsyncStorage に保持し、復帰時に送信する
 *   （アプリ再起動をまたいでも失われないように永続化する）
 * - viewable impression（広告が画面内に 50%以上・1秒以上表示）は同一クリエイティブにつき
 *   クライアント側でも 30 秒に 1 回までに間引く（補-8-6-1。サーバ側の 30 秒重複排除と二重の安全策）
 *
 * viewable impression の判定方法（RN には IntersectionObserver 相当が無いための近似）は
 * `useViewableImpression`（本ファイル下部）のコメントを参照。
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useRef } from 'react'
import type { LayoutChangeEvent } from 'react-native'

import { request } from '../api/client'

const STORAGE_KEY = 'jtour.analytics.buffer'
/** 補-8-6-2: オフライン時の最大保持件数（CMS 側の1リクエスト上限とも一致させている） */
const MAX_BUFFER = 200
const BATCH_SIZE = 20
const FLUSH_INTERVAL_MS = 10_000
/** 補-8-6-1: 同一セッション・同一クリエイティブは 30 秒に 1 回まで（クライアント側の一次防御） */
const IMPRESSION_DEDUPE_MS = 30_000

export type AnalyticsEventName =
  | 'screen_view'
  | 'impression'
  | 'click'
  | 'video_start'
  | 'video_progress'
  | 'video_complete'
  | 'share'

export type VideoProgressPercent = 25 | 50 | 75 | 100

export type AnalyticsEvent = {
  eventName: AnalyticsEventName
  occurredAt: string
  deviceId?: string
  userId?: string | number
  screen?: string
  adCreativeId?: string | number
  videoId?: string | number
  progressPercent?: VideoProgressPercent
  props?: Record<string, unknown>
}

/** ログイン状態・deviceId は Jotai ストア側から注入する（`api/client.ts` の authSupplier と同じ方式） */
let identity: { deviceId?: string; userId?: string | number } = {}
export const setAnalyticsIdentity = (next: { deviceId?: string; userId?: string | number }) => {
  identity = next
}

let online = true
export const setAnalyticsOnline = (isOnline: boolean) => {
  const wasOffline = !online
  online = isOnline
  if (isOnline && wasOffline) void flush()
}

let queue: AnalyticsEvent[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null
let flushing = false
let restored = false
let restorePromise: Promise<void> | null = null
/** 直近に impression を送ったクリエイティブ ID → 送信時刻(ms) */
const impressionLastSentAt = new Map<string, number>()

const persist = () => {
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue)).catch(() => undefined)
}

const ensureRestored = async (): Promise<void> => {
  if (restored) return
  if (!restorePromise) {
    restorePromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed: unknown = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            // 復元分を先頭に、起動直後に既に積まれたイベントはそのまま後ろに残す
            queue = [...(parsed as AnalyticsEvent[]), ...queue].slice(-MAX_BUFFER)
          }
        }
      } catch {
        // 破損データは無視する（送信できないより起動を優先する）
      } finally {
        restored = true
      }
    })()
  }
  return restorePromise
}

const ensureFlushTimer = () => {
  if (flushTimer) return
  flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS)
}

const sendBatch = async (batch: AnalyticsEvent[]): Promise<boolean> => {
  try {
    await request<unknown>('/api/analytics-events/batch', { method: 'POST', body: { events: batch } })
    return true
  } catch {
    return false
  }
}

/** キューを 20 件ずつ送る。オフライン中や送信失敗時はキューに残したまま次回に回す */
export const flush = async (): Promise<void> => {
  if (flushing) return
  await ensureRestored()
  if (!online || queue.length === 0) return

  flushing = true
  try {
    while (online && queue.length > 0) {
      const batch = queue.slice(0, BATCH_SIZE)
      const ok = await sendBatch(batch)
      if (!ok) break
      queue = queue.slice(batch.length)
      persist()
    }
  } finally {
    flushing = false
  }
}

const enqueue = (event: AnalyticsEvent) => {
  void ensureRestored().then(() => {
    queue = [...queue, event].slice(-MAX_BUFFER)
    persist()
    ensureFlushTimer()
    if (online && queue.length >= BATCH_SIZE) void flush()
  })
}

const baseEvent = (eventName: AnalyticsEventName, extra: Partial<AnalyticsEvent> = {}): AnalyticsEvent => ({
  eventName,
  occurredAt: new Date().toISOString(),
  deviceId: identity.deviceId,
  userId: identity.userId,
  ...extra,
})

/** T-15-7 / 補-8-7-2: 画面表示。expo-router の遷移フックから呼ぶ */
export const trackScreenView = (screen: string) => enqueue(baseEvent('screen_view', { screen }))

/** T-15-4 / 補-8-6-1: viewable impression（広告が画面内に50%以上・1秒以上表示） */
export const trackImpression = (creativeId: string | number) => {
  const key = String(creativeId)
  const now = Date.now()
  const last = impressionLastSentAt.get(key)
  if (last !== undefined && now - last < IMPRESSION_DEDUPE_MS) return
  impressionLastSentAt.set(key, now)
  enqueue(baseEvent('impression', { adCreativeId: creativeId }))
}

export const trackClick = (creativeId: string | number) => enqueue(baseEvent('click', { adCreativeId: creativeId }))

export const trackVideoStart = (videoId: string | number) => enqueue(baseEvent('video_start', { videoId }))

/** T-15-6 / 補-8-4-2: 25/50/75/100% 到達で送る */
export const trackVideoProgress = (videoId: string | number, progressPercent: VideoProgressPercent) =>
  enqueue(baseEvent('video_progress', { videoId, progressPercent }))

export const trackVideoComplete = (videoId: string | number) => enqueue(baseEvent('video_complete', { videoId }))

export const trackShare = (props?: Record<string, unknown>) => enqueue(baseEvent('share', { props }))

/** アプリ起動時に1度だけ呼ぶ（`app/_layout.tsx`）。定期フラッシュタイマーを開始し、永続化分の送信を試みる */
export const startAnalytics = () => {
  ensureFlushTimer()
  void flush()
}

/* ---------------- 動画進捗トラッカー（T-15-6） ---------------- */

const PROGRESS_THRESHOLDS: VideoProgressPercent[] = [25, 50, 75, 100]

/**
 * `expo-video` の再生位置から 25/50/75/100% 到達を検知して1回ずつ送るヘルパー。
 * 動画（またはシークで巻き戻った）が変わったら `reset()` を呼ぶこと。
 */
export const createVideoProgressTracker = (videoId: string | number) => {
  const sent = new Set<VideoProgressPercent>()
  return {
    onProgress: (currentTimeSec: number, durationSec: number) => {
      if (!durationSec || durationSec <= 0) return
      const pct = (currentTimeSec / durationSec) * 100
      for (const threshold of PROGRESS_THRESHOLDS) {
        if (pct >= threshold && !sent.has(threshold)) {
          sent.add(threshold)
          trackVideoProgress(videoId, threshold)
        }
      }
    },
    reset: () => sent.clear(),
  }
}

/* ---------------- viewable impression（広告の可視判定） ---------------- */

/** 補-8-6-1: 「50%以上の面積が1秒以上」の閾値のうち、連続表示時間の判定に使う */
const VIEWABLE_CONTINUOUS_MS = 1000

/**
 * viewable impression の可視判定フック。
 *
 * React Native には Web の IntersectionObserver に相当する API が無く、スクロール位置に対する
 * 要素の可視面積を厳密に追跡する標準手段が無い。そのため本フックでは
 * 「レイアウトが確定し（`onLayout` で非ゼロサイズを観測）、かつマウントされたまま
 * 1 秒間継続した」ことをもって "50%以上・1秒以上表示された" ことの近似とする。
 *
 * この近似の限界: スクロールで画面外に出ても RN の View 自体はアンマウントされないことが多いため、
 * 「一度も表示領域に入らないまま裏で1秒経過した」場合は誤検知しうる。より厳密な可視判定が要る
 * 一覧（例: `StoryViewer` の縦スクロールフィード）では `FlatList` の `viewabilityConfig`
 * （`itemVisiblePercentThreshold`）を使うこと。広告枠（`AdSlot`）は単発表示が中心のため、
 * この近似で十分と判断した。
 */
export const useViewableImpression = (onVisible: () => void, enabled = true) => {
  const firedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onVisibleRef = useRef(onVisible)
  onVisibleRef.current = onVisible

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const onLayout = (e: LayoutChangeEvent) => {
    if (!enabled || firedRef.current || timerRef.current) return
    const { width, height } = e.nativeEvent.layout
    if (width <= 0 || height <= 0) return
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      onVisibleRef.current()
    }, VIEWABLE_CONTINUOUS_MS)
  }

  return { onLayout }
}
