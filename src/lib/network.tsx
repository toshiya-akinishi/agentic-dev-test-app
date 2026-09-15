/** ネットワーク品質の監視（8-2 / 補-8-2-1, 補-8-2-2） */
import * as Network from 'expo-network'
import { useAtom, useSetAtom } from 'jotai'
import { useEffect, useRef } from 'react'

import { networkQualityAtom, type NetworkQuality } from '../store/network'

/** 直近のAPI応答時間（移動平均）。2秒超で poor 判定（補-8-2-2） */
const SLOW_THRESHOLD_MS = 2000
const WINDOW = 5

let samples: number[] = []

export const recordLatency = (ms: number) => {
  samples.push(ms)
  if (samples.length > WINDOW) samples.shift()
}

export const averageLatency = (): number =>
  samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0

export const resetLatency = () => {
  samples = []
}

const qualityFrom = (
  isConnected: boolean | null,
  isInternetReachable: boolean | null,
  type: Network.NetworkStateType | undefined,
): NetworkQuality => {
  if (isConnected === false || isInternetReachable === false) return 'offline'
  // セルラー(特に 2G/3G 相当) や 応答遅延が大きい場合は poor
  if (type === Network.NetworkStateType.CELLULAR && averageLatency() > SLOW_THRESHOLD_MS) {
    return 'poor'
  }
  if (averageLatency() > SLOW_THRESHOLD_MS) return 'poor'
  return 'good'
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

    return () => {
      mounted = false
      if (timer.current) clearInterval(timer.current)
      sub?.remove?.()
    }
  }, [setQuality])
}

/** オフライン表示バー用に、キャッシュの最終更新時刻を保持する */
export const useOfflineBanner = () => {
  const [quality] = useAtom(networkQualityAtom)
  return quality === 'offline'
}
