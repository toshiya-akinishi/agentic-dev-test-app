/**
 * 現在地の取得（T-08-6 / 補-1-30-1, 2）。
 * 初回のみ権限ダイアログを出し、拒否時は「現在地を表示できません」の状態を返すだけで
 * 他機能は制限しない（呼び出し側は unavailable/denied を無視して他の UI を表示し続ければよい）。
 */
import * as Location from 'expo-location'
import { useEffect, useRef, useState } from 'react'

import type { LatLng } from './geo'

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'

export type CurrentLocationState = {
  status: LocationStatus
  coords?: LatLng
  /** メートル単位の推定精度（補-1-30-2 の精度円に使用） */
  accuracy?: number | null
}

/** 補-1-30-1: 権限確認・位置監視を1画面につき1度だけ開始する */
export const useCurrentLocation = (enabled: boolean): CurrentLocationState => {
  const [state, setState] = useState<CurrentLocationState>({ status: 'idle' })
  const startedRef = useRef(false)

  useEffect(() => {
    if (!enabled || startedRef.current) return
    startedRef.current = true

    let cancelled = false
    let subscription: Location.LocationSubscription | undefined

    const start = async () => {
      setState((s) => ({ ...s, status: 'requesting' }))
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (cancelled) return
        if (status !== 'granted') {
          setState({ status: 'denied' })
          return
        }
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 10_000, distanceInterval: 15 },
          (loc) => {
            if (cancelled) return
            setState({
              status: 'granted',
              coords: { lat: loc.coords.latitude, lng: loc.coords.longitude },
              accuracy: loc.coords.accuracy,
            })
          },
        )
      } catch {
        if (!cancelled) setState({ status: 'unavailable' })
      }
    }

    void start()

    return () => {
      cancelled = true
      subscription?.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return state
}
