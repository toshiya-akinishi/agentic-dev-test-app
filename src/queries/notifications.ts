/**
 * 通知基盤のデータ取得/更新フック（EP-14 / 要求 1-23, 4-16, 4-17, 6-16, 6-17）。
 * 画面からは必ずこのフック経由で呼ぶ（AGENTS.md 3章）。
 *
 * 扱う範囲:
 * - デバイストークン登録（T-14-1 / ADR-013: 実配信は行わないため、レコードの存在自体を目的とした
 *   ベストエフォート実装。権限拒否・トークン取得失敗はアプリ利用を妨げない）
 * - 通知設定（T-14-5 / 4-16, 4-17, 6-16: マスタースイッチ・優勝争い・選手別 8 イベント）
 * - 通知センター（T-14-11 / 6-17: 一覧・既読化・未読バッジ）
 * - 緊急バナー（T-14-4 / 1-23, 補-1-23-4, ADR-015: 大会/ラウンドの status を監視し、
 *   ユーザーの通知設定に一切関わらず表示する）
 */
import * as Notifications from 'expo-notifications'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform } from 'react-native'

import { createDoc, listCollection, request, updateDoc } from '../api/client'
import { or } from '../api/query'
import { relId } from '../features/common'
import { authUserAtom, deviceIdAtom } from '../store/auth'
import { emergencyBannerAtom, unreadNotificationCountAtom, type EmergencyBanner } from '../store/ui'
import { getCustom, useApiMutation, useList, useLiveQuery, useQueryClient, type PaginatedResponse } from './hooks'
import { qk } from './keys'
import type { DeviceToken, NotificationSetting, Round, Tournament } from '../types/payload'

/* ---------------- 宛先識別（補-6-1-1） ---------------- */

export const useNotificationIdentity = () => {
  const user = useAtomValue(authUserAtom)
  const deviceId = useAtomValue(deviceIdAtom)
  const ownerKey = user ? `user:${user.id}` : deviceId ? `device:${deviceId}` : 'none'
  return { user, deviceId, ownerKey }
}

/* ---------------- デバイストークン登録（T-14-1 / ADR-013） ---------------- */

const obtainExpoPushToken = async (fallbackSeed: string): Promise<string> => {
  try {
    // projectId 未指定時は Constants.expoConfig.extra.eas.projectId にフォールバックする仕様
    // （expo-notifications 側の既定動作）。この検証環境には EAS projectId が無いため失敗しうる。
    const { data } = await Notifications.getExpoPushTokenAsync()
    return data
  } catch {
    // ADR-013: 実配信は行わないため、取得失敗時もレコードの存在自体を優先し疑似トークンで代替する
    return `mock-expo-token:${fallbackSeed}`
  }
}

const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') return
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  } catch {
    // ベストエフォート
  }
}

/**
 * アプリ起動時・ログイン時に呼ぶ（T-14-1）。権限ダイアログ→トークン取得→登録まで行うが、
 * 途中のどの失敗（権限拒否・オフライン・projectId未設定等）もアプリ利用をブロックしない。
 * Web は `device-tokens.platform` が ios/android のみのため対象外。
 */
export const useRegisterDeviceToken = () => {
  const { user, deviceId } = useNotificationIdentity()
  const registeredIdentityRef = useRef<string | null>(null)

  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return
    if (!user && !deviceId) return

    const identityKey = user ? `user:${user.id}` : `device:${deviceId}`
    if (registeredIdentityRef.current === identityKey) return

    let cancelled = false
    void (async () => {
      try {
        let permission = await Notifications.getPermissionsAsync()
        if (permission.status !== 'granted' && permission.canAskAgain !== false) {
          permission = await Notifications.requestPermissionsAsync()
        }
        // 補-6-16-2: 未許可の案内は設定画面側（`useNotificationPermission`）で行う。ここではブロックしない
        if (permission.status !== 'granted' || cancelled) return

        await ensureAndroidChannel()
        const token = await obtainExpoPushToken(deviceId ?? String(user?.id ?? 'unknown'))
        if (cancelled) return

        const platform: DeviceToken['platform'] = Platform.OS === 'ios' ? 'ios' : 'android'
        const ownerPatch = user ? { owner: user.id } : deviceId ? { deviceId } : {}

        try {
          await createDoc<DeviceToken>('device-tokens', {
            token,
            platform,
            ...ownerPatch,
            lastActiveAt: new Date().toISOString(),
          })
        } catch {
          // token は unique 制約があるため、再起動等で既存の場合は最終アクティブ日時/オーナーを更新するだけにする
          const existing = await listCollection<DeviceToken>('device-tokens', {
            where: { token: { equals: token } },
            limit: 1,
          }).catch(() => undefined)
          const doc = existing?.docs[0]
          if (doc) {
            await updateDoc<DeviceToken>('device-tokens', doc.id, {
              lastActiveAt: new Date().toISOString(),
              ...ownerPatch,
            }).catch(() => undefined)
          }
        }

        if (!cancelled) registeredIdentityRef.current = identityKey
      } catch {
        // T-14-1: ベストエフォート。権限拒否・オフライン等でアプリ利用は妨げない
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, deviceId])
}

/**
 * 補-6-16-2: 設定画面上部の「端末の通知が OFF です」バナー判定用。
 * `null` は確認中、`true`/`false` が確定値。Web は権限概念が無いため常に `true` 扱いにする。
 * 画面フォーカスのたびに呼び直せるよう `recheck` も返す（OS設定から戻ってきた際の再確認用）。
 */
export const useNotificationPermission = () => {
  const [granted, setGranted] = useState<boolean | null>(null)

  const recheck = useCallback(async () => {
    if (Platform.OS === 'web') {
      setGranted(true)
      return
    }
    try {
      const p = await Notifications.getPermissionsAsync()
      setGranted(p.status === 'granted')
    } catch {
      setGranted(null)
    }
  }, [])

  useEffect(() => {
    void recheck()
  }, [recheck])

  return { granted, recheck }
}

/* ---------------- 通知設定（T-14-5 / 4-16, 4-17, 6-16） ---------------- */

export type PlayerNotificationEntry = NonNullable<NotificationSetting['perPlayer']>[number]

/** 補-4-16-1 の 8 イベント。表示順はこの並びで統一する */
export const NOTIFICATION_EVENT_ORDER = [
  'birdie',
  'eagle',
  'bogeyOrWorse',
  'cutLineChange',
  'top10',
  'startReminder30',
  'startReminder15',
  'goodScore',
] as const

export type NotificationEventKey = (typeof NOTIFICATION_EVENT_ORDER)[number]

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventKey, string> = {
  birdie: 'バーディ',
  eagle: 'イーグル以上',
  bogeyOrWorse: 'ボギー以下',
  cutLineChange: 'カット圏内変動',
  top10: 'トップ10入り',
  startReminder30: 'スタート30分前',
  startReminder15: 'スタート15分前',
  goodScore: '好スコア（通算-4以下 or 1H イーグル以上）',
}

/**
 * 新規選手追加時の初期値（CMS `notification-settings.perPlayer` の各フィールド defaultValue と同一。
 * 補-4-16-3: 本来は「お気に入り選手は一部ON・それ以外はOFF」だが、CMS スキーマ側の defaultValue は
 * 選手を区別しないため、アプリ側もそれに合わせて一律この初期値を使う（既知の簡略化）。
 */
export const DEFAULT_PLAYER_NOTIFICATION: Omit<PlayerNotificationEntry, 'player' | 'id'> = {
  birdie: true,
  eagle: true,
  bogeyOrWorse: false,
  cutLineChange: false,
  top10: false,
  startReminder30: true,
  startReminder15: false,
  goodScore: false,
}

/** ユーザー/端末ごとに1レコード（`notification-settings`） */
export const useNotificationSettings = () => {
  const { user, deviceId, ownerKey } = useNotificationIdentity()

  const query = useList<NotificationSetting>(
    qk.notificationSettings(ownerKey),
    'notification-settings',
    {
      where: or(
        user ? { owner: { equals: user.id } } : undefined,
        deviceId ? { deviceId: { equals: deviceId } } : undefined,
      ),
      limit: 1,
      depth: 2, // perPlayer.player -> photo
    },
    { enabled: Boolean(user || deviceId) },
  )

  const doc = query.data?.docs[0]
  return { ...query, doc, ownerKey }
}

/**
 * 設定の保存。既存レコードがあれば PATCH、無ければ作成する（1ユーザー/端末1レコード）。
 * `perPlayer` は配列全体を送る必要があるため、呼び出し側で `upsertPlayerNotification` /
 * `removePlayerNotification` を使って現在値から次の配列を組み立てる。
 */
export const useSaveNotificationSettings = () => {
  const { user, deviceId, ownerKey } = useNotificationIdentity()
  const queryClient = useQueryClient()

  return useApiMutation<
    NotificationSetting,
    { id?: number; patch: Partial<Pick<NotificationSetting, 'master' | 'titleRace' | 'perPlayer'>> }
  >(
    async ({ id, patch }) => {
      if (id) {
        const res = await updateDoc<NotificationSetting>('notification-settings', id, patch)
        return res.doc
      }
      const res = await createDoc<NotificationSetting>('notification-settings', {
        ...(user ? { owner: user.id } : deviceId ? { deviceId } : {}),
        master: true,
        emergency: true, // ADR-015: 常時 true・UI 上も変更不可
        titleRace: false,
        perPlayer: [],
        ...patch,
      })
      return res.doc
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: qk.notificationSettings(ownerKey) })
      },
    },
  )
}

/** 選手別設定の追加・更新（補-4-16-2: お気に入り登録していない選手も対象） */
export const upsertPlayerNotification = (
  perPlayer: PlayerNotificationEntry[] | undefined,
  playerId: number,
  patch: Partial<Omit<PlayerNotificationEntry, 'player' | 'id'>>,
): PlayerNotificationEntry[] => {
  const list = perPlayer ? [...perPlayer] : []
  const idx = list.findIndex((e) => relId(e.player) === playerId)
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch }
    return list
  }
  list.push({ player: playerId, ...DEFAULT_PLAYER_NOTIFICATION, ...patch })
  return list
}

export const removePlayerNotification = (
  perPlayer: PlayerNotificationEntry[] | undefined,
  playerId: number,
): PlayerNotificationEntry[] => (perPlayer ?? []).filter((e) => relId(e.player) !== playerId)

/* ---------------- 通知センター（T-14-11 / 6-17） ---------------- */

export type NotificationCenterItem = {
  id: number
  type: 'emergency' | 'player_event' | 'start_reminder' | 'title_race' | 'news' | 'cut_line'
  title: string
  body: string
  deepLink: string | null
  tournament: unknown
  player: unknown
  priority: 'high' | 'normal' | 'low'
  sentAt: string
  read: boolean
  pinned: boolean
}

export type NotificationCenterResponse = {
  identity: { type: 'user'; userId: number } | { type: 'device'; deviceId: string }
  unreadCount: number
  total: number
  page: number
  limit: number
  notifications: NotificationCenterItem[]
}

/** `GET /api/notifications/me`（6-17 / 補-6-17-1〜3）。緊急・未読ピン留めはサーバー側で並べ替え済み */
export const useNotificationCenter = (
  params: { page?: number; limit?: number; unreadOnly?: boolean; live?: boolean } = {},
) => {
  const { user, deviceId, ownerKey } = useNotificationIdentity()
  const { page = 1, limit = 20, unreadOnly = false, live = false } = params

  return useLiveQuery<NotificationCenterResponse>(
    qk.notifications(ownerKey, { page, limit, unreadOnly }),
    () =>
      getCustom<NotificationCenterResponse>('/api/notifications/me', {
        page,
        limit,
        unreadOnly: unreadOnly ? 'true' : undefined,
      }),
    live,
    { enabled: Boolean(user || deviceId), intervalMs: 60_000 },
  )
}

/** `POST /api/notifications/mark-read`（既読化。単体/複数/全件） */
export const useMarkNotificationsRead = () => {
  const { ownerKey } = useNotificationIdentity()
  const queryClient = useQueryClient()

  return useApiMutation<{ message: string; markedRead: number }, { id?: number; ids?: number[]; all?: boolean }>(
    (body) => request('/api/notifications/mark-read', { method: 'POST', body }),
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['notifications', ownerKey] })
      },
    },
  )
}

/**
 * 未読バッジ数を `unreadNotificationCountAtom` へ同期する（T-14-11 / 補-6-17-1）。
 * `app/_layout.tsx` の起動時に1度だけ呼ぶ。60秒ポーリング + フォアグラウンド復帰時再取得（ADR-023）。
 */
export const useUnreadNotificationCountSync = () => {
  const { user, deviceId, ownerKey } = useNotificationIdentity()
  const setUnread = useSetAtom(unreadNotificationCountAtom)

  const query = useLiveQuery<NotificationCenterResponse>(
    qk.notifications(ownerKey, { scope: 'badge' }),
    () => getCustom<NotificationCenterResponse>('/api/notifications/me', { limit: 1, unreadOnly: 'true' }),
    true,
    { enabled: Boolean(user || deviceId), intervalMs: 60_000 },
  )

  const unreadCount = query.data?.unreadCount ?? 0
  useEffect(() => {
    setUnread(Boolean(user || deviceId) ? unreadCount : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadCount, user, deviceId, setUnread])
}

/* ---------------- 緊急バナー（T-14-4 / 1-23, 補-1-23-4, ADR-015） ---------------- */

type EmergencyTournamentRow = Pick<Tournament, 'id' | 'name' | 'status'>

/**
 * 大会が cancelled/postponed の間、またはラウンドが suspended（中断）の間、常時バナーを表示する。
 * ADR-015: ユーザーの通知設定・マスタースイッチには一切関わらない（判定に settings を経由しない）。
 * `app/_layout.tsx` の起動時に1度だけ呼ぶ。30秒ポーリング + フォアグラウンド復帰時再取得。
 */
export const useEmergencyBannerSync = () => {
  const setBanner = useSetAtom(emergencyBannerAtom)

  const statusQuery = useLiveQuery<PaginatedResponse<EmergencyTournamentRow>>(
    qk.emergencyStatus(),
    () =>
      listCollection<EmergencyTournamentRow>('tournaments', {
        where: { status: { in: 'cancelled,postponed,live' } },
        sort: '-startDate',
        limit: 10,
        depth: 0,
        select: ['name', 'status'],
      }),
    true,
    { intervalMs: 30_000 },
  )

  const docs = statusQuery.data?.docs ?? []
  const cancelled = docs.find((t) => t.status === 'cancelled')
  const postponed = docs.find((t) => t.status === 'postponed')
  const liveTournament = docs.find((t) => t.status === 'live')

  const roundsQuery = useLiveQuery<PaginatedResponse<Round>>(
    qk.rounds(String(liveTournament?.id ?? '')),
    () =>
      listCollection<Round>('rounds', {
        where: { tournament: { equals: liveTournament?.id } },
        sort: 'number',
        limit: 8,
        depth: 0,
      }),
    true,
    { enabled: Boolean(liveTournament), intervalMs: 30_000 },
  )
  const suspendedRound = (roundsQuery.data?.docs ?? []).find((r) => r.status === 'suspended')

  const banner = useMemo<EmergencyBanner>(() => {
    if (cancelled) {
      return { id: `tournament:${cancelled.id}:cancelled`, title: `${cancelled.name}は中止となりました`, type: 'cancelled' }
    }
    if (postponed) {
      return { id: `tournament:${postponed.id}:postponed`, title: `${postponed.name}は順延となりました`, type: 'postponed' }
    }
    if (liveTournament && suspendedRound) {
      return {
        id: `round:${suspendedRound.id}:suspended`,
        title: `${liveTournament.name}は競技を中断しています`,
        type: 'suspended',
      }
    }
    return null
  }, [cancelled, postponed, liveTournament, suspendedRound])

  useEffect(() => {
    setBanner(banner)
  }, [banner, setBanner])
}
