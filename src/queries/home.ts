/**
 * ホーム画面のデータ取得フック（EP-06 / 要求 1-11, 2-13, 3-1, 4-2, 4-13）。
 *
 * ADR-008 / 補-2-14-2: ここで扱うお気に入り由来のレーン（2-13(b) / 4-2 / 4-13）は
 * **ユーザー依存・動的生成**。全ユーザー共通・運営編成の 2-14 カルーセルは
 * `src/queries/highlights.ts` にあり、別物として分けている。
 */
import { useAtomValue } from 'jotai'
import { useMemo } from 'react'

import { ApiError, createDoc, deleteDoc, updateDoc } from '../api/client'
import { or } from '../api/query'
import { commaList, relDoc, relId } from '../features/common'
import { authUserAtom, deviceIdAtom } from '../store/auth'
import { useApiMutation, useList, useQueryClient } from './hooks'
import { qk } from './keys'
import type { Favorite, Player, Round, Score, Tournament } from '../types/payload'

/** ADR-006 / 補-4-12-1: お気に入りは 1 ユーザー（1 端末）あたり 10 名まで */
export const MAX_FAVORITES = 10

/** 開催中/直近大会カードの順位表示件数（04-screen-spec.md 2章: 順位トップ3） */
export const HOME_TOP_N = 3

/**
 * お気に入り選手（4-13）。
 * 補-6-1-1: ログイン時は `owner`、ゲスト時は `deviceId` で引く。
 * （API クライアントが X-Device-Id を自動付与するためアクセス制御側でも絞られるが、
 *   どちらで引いているかをコード上で明示するため where も明示的に組む）
 */
export const useFavoritePlayers = () => {
  const user = useAtomValue(authUserAtom)
  const deviceId = useAtomValue(deviceIdAtom)

  const ownerKey = user ? `user:${user.id}` : deviceId ? `device:${deviceId}` : 'none'

  const query = useList<Favorite>(
    qk.favorites(ownerKey),
    'favorites',
    {
      where: or(
        user ? { owner: { equals: user.id } } : undefined,
        deviceId ? { deviceId: { equals: deviceId } } : undefined,
      ),
      sort: 'order',
      limit: MAX_FAVORITES,
      depth: 2, // favorite -> player -> photo
    },
    { enabled: Boolean(user || deviceId) },
  )

  const favorites = query.data?.docs ?? []

  const players = useMemo<Player[]>(
    () => favorites.map((f) => relDoc<Player>(f.player)).filter((p): p is Player => Boolean(p)),
    [favorites],
  )

  const playerIds = useMemo(
    () => favorites.map((f) => relId(f.player)).filter((x): x is number => typeof x === 'number'),
    [favorites],
  )

  /** T-13-5/T-13-6: プレイヤー id → 該当 favorite ドキュメント id（解除・並べ替えに使用） */
  const favoriteIdByPlayerId = useMemo(() => {
    const map = new Map<number, number>()
    for (const f of favorites) {
      const pid = relId(f.player)
      if (typeof pid === 'number') map.set(pid, f.id)
    }
    return map
  }, [favorites])

  return { ...query, favorites, players, playerIds, favoriteIdByPlayerId, ownerKey }
}

/**
 * お気に入り選手の登録/解除（T-13-5 / 補-4-12-1, 2, 4）。
 * 選手一覧・選手詳細・リーダーボード・お気に入り一覧のどこからでも同じフックを呼び、
 * 即時に状態が同期される（`qk.favorites` の invalidate で共通反映）。
 * ADR-006: 上限 10 名。上限到達時はクライアント側でチェックしエラーを投げる
 * （`Favorites` コレクション側にサーバ側の上限強制が無いための補完 — 既知のギャップ）。
 */
export const useToggleFavoritePlayer = () => {
  const user = useAtomValue(authUserAtom)
  const deviceId = useAtomValue(deviceIdAtom)
  const ownerKey = user ? `user:${user.id}` : deviceId ? `device:${deviceId}` : 'none'
  const queryClient = useQueryClient()

  return useApiMutation<
    void,
    { playerId: number; favoriteId?: number; currentCount: number; nextOrder: number }
  >(
    async ({ playerId, favoriteId, currentCount, nextOrder }) => {
      if (favoriteId) {
        await deleteDoc('favorites', favoriteId)
        return
      }
      if (currentCount >= MAX_FAVORITES) {
        throw new ApiError(`お気に入り選手は${MAX_FAVORITES}名まで登録できます`, 400)
      }
      await createDoc<Favorite>('favorites', {
        player: playerId,
        order: nextOrder,
        ...(user ? { owner: user.id } : deviceId ? { deviceId } : {}),
      })
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: qk.favorites(ownerKey) })
      },
    },
  )
}

/** 補-4-12-3: お気に入り一覧の並べ替え（`favorites.order` を更新するだけの薄いラッパ） */
export const useReorderFavoritePlayer = () => {
  const user = useAtomValue(authUserAtom)
  const deviceId = useAtomValue(deviceIdAtom)
  const ownerKey = user ? `user:${user.id}` : deviceId ? `device:${deviceId}` : 'none'
  const queryClient = useQueryClient()

  return useApiMutation<void, { favoriteId: number; order: number }>(
    async ({ favoriteId, order }) => {
      await updateDoc<Favorite>('favorites', favoriteId, { order })
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: qk.favorites(ownerKey) })
      },
    },
  )
}

/**
 * ホームに出す「開催中 / 直近」の大会（3-1）。
 * 開催中があれば最優先、なければ直近の開催予定、それも無ければ直近に終わった大会。
 * 1 リクエストで判定したいので新しい順に取得して JS 側で選ぶ。
 */
export const useHomeTournament = () => {
  const query = useList<Tournament>(qk.tournaments({ scope: 'home' }), 'tournaments', {
    sort: '-startDate',
    limit: 20,
    depth: 1, // tournament -> venue / heroImage
  })

  const tournament = useMemo<Tournament | undefined>(() => {
    const docs = query.data?.docs ?? []
    if (!docs.length) return undefined
    const live = docs.find((t) => t.status === 'live')
    if (live) return live
    const now = Date.now()
    const upcoming = docs
      .filter((t) => new Date(t.endDate).getTime() >= now && t.status !== 'cancelled')
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    if (upcoming.length) return upcoming[0]
    return docs[0]
  }, [query.data])

  return { ...query, tournament }
}

/** 大会の最新ラウンド（結果が入っているラウンドを優先） */
export const useLatestRound = (tournamentId?: string) => {
  const query = useList<Round>(
    qk.rounds(tournamentId ?? ''),
    'rounds',
    {
      where: { tournament: { equals: tournamentId } },
      sort: '-number',
      limit: 4,
      depth: 0,
    },
    { enabled: Boolean(tournamentId) },
  )

  const round = useMemo<Round | undefined>(() => {
    const docs = query.data?.docs ?? []
    return (
      docs.find((r) => r.status === 'live') ??
      docs.find((r) => r.status === 'suspended') ??
      docs.find((r) => r.status === 'finished') ??
      docs[0]
    )
  }, [query.data])

  return { ...query, round }
}

/**
 * 開催中/直近大会カードの順位トップ3（3-1）。
 * EP-10 の `/api/leaderboard/:tournamentId` が入るまでは `scores` を直接引く。
 */
export const useTopScores = (roundId?: number, limit: number = HOME_TOP_N) =>
  useList<Score>(
    qk.leaderboard(String(roundId ?? ''), { scope: 'home-top', limit }),
    'scores',
    {
      where: { round: { equals: roundId } },
      sort: 'position',
      limit,
      depth: 2, // score -> player -> photo
    },
    { enabled: Boolean(roundId) },
  )

/**
 * お気に入り選手レーンのスコア（4-13 / 04-screen-spec.md 2章「スコア + ハイライト動画」）。
 * 2-13(b) の動画レーン自体は EP-12 で実装するため、ここではスコアのみを引く。
 */
export const useFavoritePlayerScores = (roundId?: number, playerIds: number[] = []) => {
  const ids = commaList(playerIds)
  const query = useList<Score>(
    qk.leaderboard(String(roundId ?? ''), { scope: 'favorites', players: ids }),
    'scores',
    {
      where: { round: { equals: roundId }, player: { in: ids } },
      limit: MAX_FAVORITES,
      depth: 1,
    },
    { enabled: Boolean(roundId) && playerIds.length > 0 },
  )

  const byPlayerId = useMemo(() => {
    const map = new Map<number, Score>()
    for (const s of query.data?.docs ?? []) {
      const pid = relId(s.player)
      if (typeof pid === 'number') map.set(pid, s)
    }
    return map
  }, [query.data])

  return { ...query, byPlayerId }
}
