/** ネットワーク品質（8-2 / 補-8-2-1, 補-8-2-2） */
import { atom } from 'jotai'

export type NetworkQuality = 'good' | 'poor' | 'offline'

/** 実測に基づく判定結果 */
export const networkQualityAtom = atom<NetworkQuality>('good')
/** ユーザーが手動で固定した低速モード（補-8-2-3） */
export const forceLowBandwidthAtom = atom(false)

/** 実効品質。手動固定が有効なら offline 以外は poor に落とす */
export const effectiveQualityAtom = atom<NetworkQuality>((get) => {
  const q = get(networkQualityAtom)
  if (q === 'offline') return 'offline'
  return get(forceLowBandwidthAtom) ? 'poor' : q
})

export const isOfflineAtom = atom((get) => get(networkQualityAtom) === 'offline')

/** 低速時はポーリング間隔を延ばす（補-8-2-1 (c)） */
export const pollIntervalAtom = atom((get) => {
  const q = get(effectiveQualityAtom)
  if (q === 'offline') return false as const
  return q === 'poor' ? 60_000 : 15_000
})

/** 低速時は動画を自動再生しない（補-8-2-1 (a)） */
export const autoplayEnabledAtom = atom((get) => get(effectiveQualityAtom) === 'good')

/** 低速時は小さい画像サイズを使う（補-8-2-1 (d)） */
export const imageSizeAtom = atom<'thumb' | 'card' | 'hero'>((get) =>
  get(effectiveQualityAtom) === 'good' ? 'card' : 'thumb',
)
