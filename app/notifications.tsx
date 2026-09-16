/**
 * 通知センター `/notifications`（T-14-11 / 要求 6-17 / 補-6-17-1〜3）。
 * 新着順一覧・既読/未読管理・ディープリンク遷移・「すべて既読」を提供する。
 * 緊急通知は未読の間、最上位にピン留め＆赤背景で区別する（サーバー側の並べ替え pin と対）。
 * `EmergencyBanner`（T-14-4）からタップで遷移してくる先もここ。
 */
import { router, Stack } from 'expo-router'
import { useStore } from 'jotai'
import React, { useState } from 'react'
import { FlatList, RefreshControl, View } from 'react-native'

import { Button, EmptyState, ErrorView, SkeletonList, Tabs, Txt } from '../src/components/ui'
import { parseNotificationDeepLink, relDoc } from '../src/features/common'
import { NotificationRow } from '../src/features/notifications'
import { useMarkNotificationsRead, useNotificationCenter, type NotificationCenterItem } from '../src/queries/notifications'
import { leaderboardFilterAtom, leaderboardSearchAtom } from '../src/store/ui'
import { colors, space } from '../src/theme'
import type { Player, Tournament } from '../src/types/payload'

type Filter = 'all' | 'unread'
const PAGE_SIZE = 20
const MAX_VISIBLE = 100 // サーバー側の1リクエスト上限（`GET /me` は limit<=100）に合わせる

export default function NotificationsScreen() {
  const [filter, setFilter] = useState<Filter>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const unreadOnly = filter === 'unread'

  const { data, isLoading, isFetching, error, refetch } = useNotificationCenter({
    limit: visibleCount,
    unreadOnly,
    live: true,
  })
  const markRead = useMarkNotificationsRead()
  const jotaiStore = useStore()

  const changeFilter = (f: Filter) => {
    setFilter(f)
    setVisibleCount(PAGE_SIZE)
  }

  const items = data?.notifications ?? []
  const hasMore = Boolean(data) && items.length < (data?.total ?? 0) && visibleCount < MAX_VISIBLE

  const openNotification = (n: NotificationCenterItem) => {
    if (!n.read) markRead.mutate({ id: n.id })

    const parsed = parseNotificationDeepLink(n.deepLink)
    if (parsed) {
      if (parsed.tournamentId && parsed.playerId) {
        // 補-4-13-2 と同じ手法: リーダーボードの絞り込みを対象選手名にセットしてから遷移する
        const player = relDoc<Player>(n.player as Player | number | null | undefined)
        const key = String(parsed.tournamentId)
        jotaiStore.set(leaderboardFilterAtom(key), 'all')
        jotaiStore.set(leaderboardSearchAtom(key), player?.name ?? '')
      }
      router.push(parsed.path)
      return
    }

    // フォールバック: deepLink が無い/未知形式の通知はリレーション先へ直接遷移する
    const tournament = relDoc<Tournament>(n.tournament as Tournament | number | null | undefined)
    if (tournament) {
      router.push(`/tournament/${tournament.id}`)
      return
    }
    const player = relDoc<Player>(n.player as Player | number | null | undefined)
    if (player) {
      router.push(`/player/${player.id}`)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: '通知センター' }} />
      <View style={styles.toolbar}>
        <View style={{ flex: 1 }}>
          <Tabs
            value={filter}
            onChange={changeFilter}
            options={[
              { value: 'all', label: 'すべて' },
              { value: 'unread', label: `未読${data?.unreadCount ? `(${data.unreadCount})` : ''}` },
            ]}
          />
        </View>
        <Button
          title="すべて既読"
          variant="ghost"
          onPress={() => markRead.mutate({ all: true })}
          disabled={markRead.isPending || !(data?.unreadCount ?? 0)}
        />
      </View>

      {isLoading ? (
        <SkeletonList rows={6} />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="🔔"
          title={unreadOnly ? '未読の通知はありません' : '通知はまだありません'}
          description="大会の緊急情報やお気に入り選手の速報はここに届きます。"
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => String(n.id)}
          renderItem={({ item }) => <NotificationRow notification={item} onPress={() => openNotification(item)} />}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />}
          onEndReached={() => {
            if (hasMore) setVisibleCount((c) => Math.min(MAX_VISIBLE, c + PAGE_SIZE))
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            hasMore ? (
              <View style={{ padding: space.lg, alignItems: 'center' }}>
                <Txt size="sm" color={colors.textMuted}>
                  読み込み中…
                </Txt>
              </View>
            ) : null
          }
        />
      )}
    </View>
  )
}

const styles = {
  toolbar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: space.lg,
  },
}
