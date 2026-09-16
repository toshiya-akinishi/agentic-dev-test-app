/** 画面横断の UI 状態（T-04-5） */
import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'

/** 大会一覧の表示モード（補-1-3-1） */
export const tournamentViewAtom = atom<'list' | 'calendar'>('list')

/** 選択中シーズン（補-1-3-3） */
export const selectedSeasonAtom = atom<string | null>(null)

/** リーダーボードの絞り込み（補-3-1-3） */
export type LeaderboardFilter = 'all' | 'favorites' | 'group'
export const leaderboardFilterAtom = atomFamily((_tournamentId: string) =>
  atom<LeaderboardFilter>('all'),
)
export const leaderboardSearchAtom = atomFamily((_tournamentId: string) => atom(''))
/** 絞り込み「組」選択時の対象組番号 */
export const leaderboardGroupAtom = atomFamily((_tournamentId: string) => atom<number | undefined>(undefined))
/** ラウンド切替（Hole-by-Hole/スタッツ展開・組フィルタの対象ラウンド） */
export const leaderboardRoundAtom = atomFamily((_tournamentId: string) => atom<number | undefined>(undefined))
/** 下部タブ: 順位表 / 速報（Play-by-play）切替（04-screen-spec.md 2章） */
export const leaderboardViewAtom = atomFamily((_tournamentId: string) => atom<'board' | 'playbyplay'>('board'))

/** 比較モードで選択中の選手（補-3-7-1: 最大4名 / ADR-007） */
export const MAX_COMPARE_PLAYERS = 4
export const comparePlayerIdsAtom = atom<string[]>([])

/** 動画一覧の6軸フィルタ（補-2-8-1, 補-2-8-3） */
export type VideoFilters = {
  tournament?: string
  round?: string
  player?: string
  hole?: number
  shotType?: string
  tag?: string
  sort: 'newest' | 'popular'
}
export const videoFiltersAtom = atom<VideoFilters>({ sort: 'newest' })

/** 会場マップの施設種別フィルタ（補-1-22-2: 複数選択） */
export const facilityFilterAtom = atom<string[]>([])

/** 通知センターの未読件数バッジ（補-6-17-1） */
export const unreadNotificationCountAtom = atom(0)

/** 緊急バナー（補-1-23-4） */
export type EmergencyBanner = { id: string; title: string; type: string } | null
export const emergencyBannerAtom = atom<EmergencyBanner>(null)
