/**
 * 通知設定 `/mypage/notifications`（T-14-5 / 要求 4-16, 4-17, 6-16）。
 * マスタースイッチ（6-16）・優勝争い通知・選手別 8 イベント（補-4-16-1）を1画面で扱う。
 * 補-4-16-2: お気に入り登録していない選手にも設定できるよう、選手検索から誰でも追加できる。
 * `?playerId=` 付きで開いた場合（選手詳細の🔔ボタンから遷移）、その選手を自動追加して展開する。
 */
import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Switch as RNSwitch, View } from 'react-native'

import { Card, Checkbox, ErrorView, SkeletonList, TextField, Txt } from '../../src/components/ui'
import { mediaUrl, relId } from '../../src/features/common'
import { useFavoritePlayers } from '../../src/queries/home'
import {
  NOTIFICATION_EVENT_LABELS,
  NOTIFICATION_EVENT_ORDER,
  useNotificationPermission,
  useNotificationSettings,
  useSaveNotificationSettings,
  upsertPlayerNotification,
  removePlayerNotification,
  type NotificationEventKey,
  type PlayerNotificationEntry,
} from '../../src/queries/notifications'
import { filterPlayers, useActivePlayers } from '../../src/queries/players'
import { colors, radius, space } from '../../src/theme'
import type { Player } from '../../src/types/payload'

export default function NotificationSettingsScreen() {
  const { playerId: playerIdParam } = useLocalSearchParams<{ playerId?: string }>()
  const requestedPlayerId = playerIdParam ? Number(playerIdParam) : undefined

  const { doc, isLoading, error, refetch } = useNotificationSettings()
  const save = useSaveNotificationSettings()
  const permissionGranted = useNotificationPermission().granted
  const { playerIds: favoritePlayerIds } = useFavoritePlayers()
  const { data: activePlayersData } = useActivePlayers()
  const allPlayers = activePlayersData?.docs ?? []

  const [search, setSearch] = useState('')
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | undefined>(requestedPlayerId)
  const autoAddedRef = useRef<number | undefined>(undefined)

  const perPlayer = doc?.perPlayer ?? []
  const configuredIds = useMemo(
    () => new Set(perPlayer.map((e) => relId(e.player)).filter((x): x is number => typeof x === 'number')),
    [perPlayer],
  )

  // ?playerId= で開かれた場合、未設定なら初期値で自動追加する（補-4-16-2）
  useEffect(() => {
    if (!requestedPlayerId || isLoading) return
    if (autoAddedRef.current === requestedPlayerId) return
    if (configuredIds.has(requestedPlayerId)) {
      autoAddedRef.current = requestedPlayerId
      return
    }
    autoAddedRef.current = requestedPlayerId
    save.mutate({
      id: doc?.id,
      patch: { perPlayer: upsertPlayerNotification(perPlayer, requestedPlayerId, {}) },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedPlayerId, isLoading, configuredIds, doc?.id])

  if (isLoading) return <SkeletonList rows={6} />
  if (error) return <ErrorView error={error} onRetry={() => void refetch()} />

  const searchResults =
    search.trim().length > 0
      ? filterPlayers(allPlayers, search).filter((p) => !configuredIds.has(p.id))
      : []

  const patchTopLevel = (patch: { master?: boolean; titleRace?: boolean }) => {
    save.mutate({ id: doc?.id, patch })
  }

  const patchPlayer = (playerId: number, patch: Partial<Omit<PlayerNotificationEntry, 'player' | 'id'>>) => {
    save.mutate({ id: doc?.id, patch: { perPlayer: upsertPlayerNotification(perPlayer, playerId, patch) } })
  }

  const addPlayer = (playerId: number) => {
    save.mutate({ id: doc?.id, patch: { perPlayer: upsertPlayerNotification(perPlayer, playerId, {}) } })
    setExpandedPlayerId(playerId)
    setSearch('')
  }

  const removePlayer = (playerId: number) => {
    save.mutate({ id: doc?.id, patch: { perPlayer: removePlayerNotification(perPlayer, playerId) } })
    if (expandedPlayerId === playerId) setExpandedPlayerId(undefined)
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {permissionGranted === false ? (
        <Card style={[styles.card, { backgroundColor: colors.bgSubtle }]}>
          <Txt weight="bold">端末の通知が OFF です</Txt>
          <Txt size="sm" color={colors.textSub} style={{ marginTop: space.xs, marginBottom: space.md }}>
            OS の設定でこのアプリの通知を許可すると、通知センターへの反映に加えて端末側の通知表示も受け取れます（補-6-16-2）。
          </Txt>
          <Pressable onPress={() => void Linking.openSettings()}>
            <Txt color={colors.primary} weight="bold">
              端末の設定を開く ›
            </Txt>
          </Pressable>
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Row
          label="通知マスタースイッチ"
          description="OFF にすると、緊急通知（中止・順延・雷警報など）を除くすべての通知を停止します。"
          value={doc?.master ?? true}
          onChange={(v) => patchTopLevel({ master: v })}
        />
        <Divider />
        <Row label="緊急通知（中止・順延・雷警報）" description="安全に関わる情報のため停止できません。" value disabled />
        <Divider />
        <Row
          label="優勝争い通知"
          description="優勝争いの局面をリアルタイムで通知します。"
          value={doc?.titleRace ?? false}
          onChange={(v) => patchTopLevel({ titleRace: v })}
        />
      </Card>

      <Txt size="sm" weight="bold" color={colors.textMuted} style={styles.sectionTitle}>
        選手別の通知設定
      </Txt>
      <Txt size="xs" color={colors.textMuted} style={{ marginBottom: space.sm }}>
        お気に入り登録していない選手にも設定できます（補-4-16-2）。
      </Txt>

      <Card style={styles.card}>
        <TextField
          placeholder="選手名で検索"
          value={search}
          onChangeText={setSearch}
        />
        {searchResults.length > 0 ? (
          <View style={{ marginTop: space.sm, gap: space.xs }}>
            {searchResults.slice(0, 8).map((p) => (
              <Pressable key={p.id} onPress={() => addPlayer(p.id)} style={styles.searchRow}>
                <PlayerAvatar player={p} />
                <Txt style={{ flex: 1 }}>{p.name}</Txt>
                <Txt color={colors.primary} weight="bold">
                  追加
                </Txt>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Card>

      {perPlayer.length === 0 ? (
        <Card style={styles.card}>
          <Txt color={colors.textSub} size="sm">
            設定済みの選手がいません。上の検索から選手を追加してください。
          </Txt>
        </Card>
      ) : (
        perPlayer.map((entry) => {
          const player = typeof entry.player === 'object' ? (entry.player as Player) : undefined
          const playerId = relId(entry.player)
          if (!playerId) return null
          const expanded = expandedPlayerId === playerId
          const isFavorite = favoritePlayerIds.includes(playerId)

          return (
            <Card key={entry.id ?? playerId} style={styles.card}>
              <Pressable
                style={styles.playerHeader}
                onPress={() => setExpandedPlayerId(expanded ? undefined : playerId)}
              >
                <PlayerAvatar player={player} />
                <View style={{ flex: 1 }}>
                  <Txt weight="bold">
                    {player?.name ?? `選手 #${playerId}`}
                    {isFavorite ? ' ★' : ''}
                  </Txt>
                  <Txt size="xs" color={colors.textMuted}>
                    {expanded ? 'タップして閉じる' : 'タップして通知イベントを編集'}
                  </Txt>
                </View>
                <Pressable onPress={() => removePlayer(playerId)} hitSlop={8}>
                  <Txt color={colors.danger}>削除</Txt>
                </Pressable>
              </Pressable>

              {expanded ? (
                <View style={{ marginTop: space.md, gap: space.sm }}>
                  {NOTIFICATION_EVENT_ORDER.map((key: NotificationEventKey) => (
                    <Checkbox
                      key={key}
                      checked={Boolean(entry[key])}
                      onChange={(v) => patchPlayer(playerId, { [key]: v })}
                      label={<Txt size="sm">{NOTIFICATION_EVENT_LABELS[key]}</Txt>}
                    />
                  ))}
                </View>
              ) : null}
            </Card>
          )
        })
      )}
    </ScrollView>
  )
}

const PlayerAvatar = ({ player }: { player?: Player }) => {
  const photo = mediaUrl(player?.photo, 'thumb')
  if (photo) {
    return <Image source={{ uri: photo }} contentFit="cover" style={styles.avatar} />
  }
  return (
    <View style={styles.avatar}>
      <Txt size="sm" weight="bold" color={colors.textInverse}>
        {player?.name?.slice(0, 1) ?? '?'}
      </Txt>
    </View>
  )
}

const Row = ({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string
  description?: string
  value: boolean
  onChange?: (v: boolean) => void
  disabled?: boolean
}) => (
  <View style={styles.row}>
    <View style={{ flex: 1, gap: 2 }}>
      <Txt weight="bold">{label}</Txt>
      {description ? (
        <Txt size="xs" color={colors.textMuted}>
          {description}
        </Txt>
      ) : null}
    </View>
    <RNSwitch
      value={value}
      disabled={disabled}
      onValueChange={onChange}
      trackColor={{ false: colors.border, true: colors.primaryLight }}
      thumbColor={colors.bgElevated}
    />
  </View>
)

const Divider = () => <View style={styles.divider} />

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  card: { gap: space.xs },
  sectionTitle: { marginTop: space.md, marginLeft: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, gap: space.md },
  divider: { height: 1, backgroundColor: colors.border },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  playerHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
