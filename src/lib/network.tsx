/** ネットワーク品質の監視（8-2 / 補-8-2-1, 補-8-2-2） */
import { focusManager } from '@tanstack/react-query'
import * as Network from 'expo-network'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

import { effectiveQualityAtom, networkQualityAtom, type NetworkQuality } from '../store/network'

/**
 * 直近のAPI応答時間（移動平均）。補-8-2-2: 接続種別 + 応答時間移動平均（閾値2秒）で判定する。
 * セルラー回線は Wi-Fi よりも変動が大きいため、閾値を少し厳しめにして早めに `poor` へ倒す
 * （接続種別だけでなく応答時間の両方が判定に効くようにする）。
 */
const WIFI_SLOW_THRESHOLD_MS = 2000
const CELLULAR_SLOW_THRESHOLD_MS = 1200
const WINDOW = 5

let samples: number[] = []
/** `recordLatency` が呼ばれるたびに即時再判定させるためのフック（`useNetworkWatcher` が登録する） */
let onLatencySample: (() => void) | null = null

/** API 呼び出しのたびに応答時間を記録する（`src/api/client.ts` から呼ばれる） */
export const recordLatency = (ms: number) => {
  samples.push(ms)
  if (samples.length > WINDOW) samples.shift()
  onLatencySample?.()
}

export const averageLatency = (): number =>
  samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0

export const resetLatency = () => {
  samples = []
}

/** 通信失敗時など、レイテンシは記録せず接続状態だけ即時再チェックしたい場合に呼ぶ */
export const notifyNetworkActivity = () => {
  onLatencySample?.()
}

const qualityFrom = (
  isConnected: boolean | null,
  isInternetReachable: boolean | null,
  type: Network.NetworkStateType | undefined,
): NetworkQuality => {
  if (
    isConnected === false ||
    isInternetReachable === false ||
    type === Network.NetworkStateType.NONE
  ) {
    return 'offline'
  }

  const avg = averageLatency()
  if (avg <= 0) return 'good' // まだサンプルが無い（起動直後・オフライン監視のみ）は good 扱い
  const threshold = type === Network.NetworkStateType.CELLULAR ? CELLULAR_SLOW_THRESHOLD_MS : WIFI_SLOW_THRESHOLD_MS
  return avg > threshold ? 'poor' : 'good'
}

/** アプリ起動時に1度だけ呼ぶ。接続状態の購読とポーリングで品質を更新する */
export const useNetworkWatcher = () => {
  const setQuality = useSetAtom(networkQualityAtom)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let mounted = true

    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync()
        if (!mounted) return
        setQuality(
          qualityFrom(
            state.isConnected ?? null,
            state.isInternetReachable ?? null,
            state.type,
          ),
        )
      } catch {
        // 取得できない環境（Web 等）では good 扱いのままにする
      }
    }

    void check()
    timer.current = setInterval(check, 10_000)

    const sub = Network.addNetworkStateListener?.((state) => {
      if (!mounted) return
      setQuality(
        qualityFrom(state.isConnected ?? null, state.isInternetReachable ?? null, state.type),
      )
    })

    // 補-8-2-2: API 応答時間が記録されるたびに即時再判定する（10秒ポーリングを待たない）
    onLatencySample = () => void check()

    return () => {
      mounted = false
      if (timer.current) clearInterval(timer.current)
      sub?.remove?.()
      onLatencySample = null
    }
  }, [setQuality])
}

/**
 * 補-3-1-2 / 補-1-31-1: フォアグラウンド復帰時にライブクエリ（`useLiveQuery` の `refetchOnWindowFocus`）を
 * 即時再取得させるための AppState 連携。TanStack Query の focusManager は既定でブラウザの
 * `visibilitychange` しか見ないため、React Native では明示的に AppState と結び付ける必要がある。
 * アプリ起動時に1度だけ呼ぶ（`app/_layout.tsx`）。
 */
export const useAppFocusManager = () => {
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active')
    }
    const sub = AppState.addEventListener('change', onChange)
    return () => sub.remove()
  }, [])
}

/** オフライン表示バー用に、キャッシュの最終更新時刻を保持する */
export const useOfflineBanner = () => {
  const [quality] = useAtom(networkQualityAtom)
  return quality === 'offline'
}

/**
 * 補-8-2-1(d): `poor`（または手動固定の低速モード）のときは `hero` サイズの画像を
 * より小さい `card` サイズへ差し替える。`thumb`/`card` を要求している呼び出し元は
 * 元々小さいサイズのためそのまま返す。
 */
export const useAdaptiveImageSize = (
  preferred: 'thumb' | 'card' | 'hero',
): 'thumb' | 'card' | 'hero' => {
  const quality = useAtomValue(effectiveQualityAtom)
  if (quality === 'good' || preferred !== 'hero') return preferred
  return 'card'
}
