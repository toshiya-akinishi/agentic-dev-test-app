/**
 * プレイリスト詳細/編集/共有 `/playlist/[id]`（T-12-9 / 要求 2-23 / 補-2-23-1, 2）。
 * 動画の削除・並べ替え（上下移動）・共有 ON/OFF・削除ができる。
 * 共有は `shareToken` 付き Web URL。閲覧は未ログインでも可、編集は所有者のみ（アプリ側では
 * 「自分のプレイリスト一覧からしか開けない」ことで簡易的に担保する。cms 側の
 * 専用トークン閲覧エンドポイントは T-12-9 の cms 側スコープ外・要確認のギャップ）。
 */
import { Image } from 'expo-image'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native'

import { Button, EmptyState, ErrorView, Loading, Txt } from '../../src/components/ui'
import { mediaUrl } from '../../src/features/common'
import { sharePlaylist } from '../../src/lib/share'
import {
  playlistVideos,
  useDeletePlaylist,
  usePlaylist,
  useRemoveVideoFromPlaylist,
  useReorderPlaylist,
  useSetPlaylistSharing,
} from '../../src/queries/playlists'
import { colors, radius, space } from '../../src/theme'
import type { Video } from '../../src/types/payload'

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: playlist, isLoading, error, refetch } = usePlaylist(id)
  const removeVideo = useRemoveVideoFromPlaylist()
  const reorder = useReorderPlaylist()
  const setSharing = useSetPlaylistSharing()
  const deletePlaylist = useDeletePlaylist()

  if (isLoading) return <Loading />
  if (error || !playlist) return <ErrorView error={error} onRetry={() => void refetch()} />

  const videos = playlistVideos(playlist)

  const confirmDelete = () => {
    Alert.alert('プレイリストを削除しますか？', undefined, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => deletePlaylist.mutate({ id: playlist.id }, { onSuccess: () => router.back() }),
      },
    ])
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: playlist.name }} />

      <View style={styles.headerRow}>
        <Txt size="sm" color={colors.textSub}>
          {videos.length}本
        </Txt>
        <Button
          title={playlist.isPublic ? '共有をやめる' : '共有する'}
          variant={playlist.isPublic ? 'secondary' : 'primary'}
          onPress={() => {
            if (playlist.isPublic) {
              setSharing.mutate({ playlist, isPublic: false })
            } else {
              setSharing.mutate(
                { playlist, isPublic: true },
                { onSuccess: (doc) => void sharePlaylist(doc) },
              )
            }
          }}
        />
        {playlist.isPublic ? (
          <Button title="URLを共有" variant="ghost" onPress={() => void sharePlaylist(playlist)} />
        ) : null}
      </View>

      {videos.length === 0 ? (
        <EmptyState
          icon="📃"
          title="動画がまだありません"
          description="いいねした動画の詳細から「プレイリストに追加」で追加できます。"
        />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(v) => String(v.id)}
          contentContainerStyle={{ paddingVertical: space.sm }}
          renderItem={({ item, index }) => (
            <PlaylistItemRow
              video={item}
              index={index}
              total={videos.length}
              onMoveUp={() => reorder.mutate({ playlist, fromIndex: index, toIndex: index - 1 })}
              onMoveDown={() => reorder.mutate({ playlist, fromIndex: index, toIndex: index + 1 })}
              onRemove={() => removeVideo.mutate({ playlist, videoId: item.id })}
            />
          )}
        />
      )}

      <View style={{ padding: space.lg }}>
        <Button title="プレイリストを削除" variant="danger" onPress={confirmDelete} />
      </View>
    </View>
  )
}

const PlaylistItemRow = ({
  video,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  video: Video
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) => (
  <Pressable style={styles.row} onPress={() => router.push(`/video/${video.id}`)}>
    <Image source={{ uri: mediaUrl(video.thumbnail, 'card') }} contentFit="cover" style={styles.thumb} />
    <Txt style={{ flex: 1 }} numberOfLines={2}>
      {video.title}
    </Txt>
    <View style={{ gap: space.xs, alignItems: 'center' }}>
      <Pressable disabled={index === 0} onPress={onMoveUp} hitSlop={8}>
        <Txt color={index === 0 ? colors.textMuted : colors.primary}>▲</Txt>
      </Pressable>
      <Pressable disabled={index === total - 1} onPress={onMoveDown} hitSlop={8}>
        <Txt color={index === total - 1 ? colors.textMuted : colors.primary}>▼</Txt>
      </Pressable>
    </View>
    <Pressable onPress={onRemove} hitSlop={8}>
      <Txt color={colors.danger}>削除</Txt>
    </Pressable>
  </Pressable>
)

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thumb: { width: 64, height: 48, borderRadius: radius.sm, backgroundColor: colors.bgSubtle },
})
