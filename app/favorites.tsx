/**
 * お気に入り一覧 `/favorites`（04-screen-spec.md 1章 / 要求 2-11, 1-45, 4-12, 4-13, 2-23）。
 *
 * このリポジトリではまだどの Epic も作成していなかった画面のため、EP-12 の担当分
 * （T-12-5: 動画タブ / T-12-9: プレイリストタブ）をここで実装する。
 * 「選手」（4-12, 4-13 / T-13-6）・「ショット」（1-45 / T-11-9）タブは別 Epic の担当のため
 * スタブのまま残す（`app/(tabs)/videos.tsx` が EP-04 スタブから始まったのと同じパターン）。
 */
import { router, Stack } from 'expo-router'
import React, { useState } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'

import { Button, EmptyState, ErrorView, SkeletonList, Tabs, TextField, Txt } from '../src/components/ui'
import { useFavoritePlayers } from '../src/queries/home'
import { useLikedVideos } from '../src/queries/likes'
import { MAX_PLAYLISTS_PER_OWNER, useCreatePlaylist, useMyPlaylists } from '../src/queries/playlists'
import { PlaylistCard } from '../src/features/playlist'
import { VideoCard } from '../src/features/videos'
import { colors, space } from '../src/theme'
import type { Video } from '../src/types/payload'

type Tab = 'video' | 'playlist' | 'player' | 'shot'

export default function FavoritesScreen() {
  const [tab, setTab] = useState<Tab>('video')

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'お気に入り' }} />
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'video', label: '動画' },
          { value: 'playlist', label: 'プレイリスト' },
          { value: 'player', label: '選手' },
          { value: 'shot', label: 'ショット' },
        ]}
      />
      <View style={{ flex: 1 }}>
        {tab === 'video' ? <VideoLikesTab /> : null}
        {tab === 'playlist' ? <PlaylistsTab /> : null}
        {tab === 'player' ? <PlayerFavoritesTab /> : null}
        {tab === 'shot' ? (
          <EmptyState
            icon="⛳"
            title="ショットのお気に入り"
            description="この画面は後続の Epic（EP-11）で実装します。"
          />
        ) : null}
      </View>
    </View>
  )
}

/** T-12-5 / 補-2-11-2: いいね動画一覧（新着順・まとめ解除） */
const VideoLikesTab = () => {
  const { videos, isLoading, error, refetch } = useLikedVideos()

  if (isLoading) return <SkeletonList rows={6} />
  if (error) return <ErrorView error={error} onRetry={() => void refetch()} />
  if (videos.length === 0) {
    return (
      <EmptyState
        icon="🤍"
        title="いいねした動画がありません"
        description="動画一覧や動画詳細でハートを押すとここに表示されます。"
        actionLabel="動画を探す"
        onAction={() => router.push('/videos')}
      />
    )
  }

  return (
    <FlatList
      data={videos}
      keyExtractor={(v) => String(v.id)}
      numColumns={2}
      columnWrapperStyle={{ gap: space.md, paddingHorizontal: space.lg }}
      contentContainerStyle={{ paddingVertical: space.lg, gap: space.lg }}
      renderItem={({ item }: { item: Video }) => (
        <View style={{ flex: 1 }}>
          <VideoCard video={item} onPress={() => router.push(`/video/${item.id}`)} />
        </View>
      )}
    />
  )
}

/** T-12-9 / 要求 2-23: いいね動画から作るプレイリスト */
const PlaylistsTab = () => {
  const { playlists, isLoading, error, refetch } = useMyPlaylists()
  const createPlaylist = useCreatePlaylist()
  const [name, setName] = useState('')

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed || playlists.length >= MAX_PLAYLISTS_PER_OWNER) return
    createPlaylist.mutate(
      { name: trimmed },
      { onSuccess: (doc) => { setName(''); router.push(`/playlist/${doc.id}`) } },
    )
  }

  if (isLoading) return <SkeletonList rows={4} />
  if (error) return <ErrorView error={error} onRetry={() => void refetch()} />

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.createRow}>
        <TextField placeholder="新しいプレイリスト名" value={name} onChangeText={setName} containerStyle={{ flex: 1 }} />
        <Button title="作成" onPress={handleCreate} loading={createPlaylist.isPending} disabled={!name.trim()} />
      </View>
      {playlists.length >= MAX_PLAYLISTS_PER_OWNER ? (
        <Txt size="xs" color={colors.danger} style={{ paddingHorizontal: space.lg }}>
          プレイリストは最大{MAX_PLAYLISTS_PER_OWNER}件までです
        </Txt>
      ) : null}
      {playlists.length === 0 ? (
        <EmptyState
          icon="📃"
          title="プレイリストがありません"
          description="いいねした動画からプレイリストを作成しましょう。"
        />
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => <PlaylistCard playlist={item} onPress={() => router.push(`/playlist/${item.id}`)} />}
        />
      )}
    </View>
  )
}

/** 4-12, 4-13（T-13-6 の担当）。ここでは既存のお気に入り選手データを一覧表示するだけの簡易版 */
const PlayerFavoritesTab = () => {
  const { players, isLoading, error, refetch } = useFavoritePlayers()

  if (isLoading) return <SkeletonList rows={4} />
  if (error) return <ErrorView error={error} onRetry={() => void refetch()} />
  if (players.length === 0) {
    return (
      <EmptyState
        icon="⭐"
        title="お気に入り選手がいません"
        description="選手を探してお気に入り登録しましょう。"
        actionLabel="選手を探す"
        onAction={() => router.push('/players')}
      />
    )
  }

  return (
    <FlatList
      data={players}
      keyExtractor={(p) => String(p.id)}
      contentContainerStyle={{ paddingVertical: space.sm }}
      renderItem={({ item }) => (
        <View style={styles.playerRow}>
          <Txt style={{ flex: 1 }}>{item.name}</Txt>
          <Pressable onPress={() => router.push(`/player/${item.id}`)} hitSlop={8}>
            <Txt size="sm" color={colors.primary}>
              詳細 ›
            </Txt>
          </Pressable>
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  createRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-end', padding: space.lg },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
})
