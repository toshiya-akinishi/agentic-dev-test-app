/**
 * 「プレイリストに追加」シート（T-12-9 / 要求 2-23 / 補-2-23-1）。
 * いいね動画・動画詳細から共通で使う。1 プレイリスト最大 50 本・1 ユーザー最大 20 件を
 * クライアント側でも検証する（cms 側の上限チェックは未確認のギャップ・報告事項）。
 */
import React, { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native'

import { Button, Sheet, TextField, Txt } from '../../components/ui'
import { mutationErrorMessage } from '../../lib/mutationFeedback'
import {
  MAX_PLAYLISTS_PER_OWNER,
  MAX_PLAYLIST_ITEMS,
  useAddVideoToPlaylist,
  useCreatePlaylist,
  useMyPlaylists,
} from '../../queries/playlists'
import { colors, space } from '../../theme'
import type { Playlist } from '../../types/payload'

export const AddToPlaylistSheet = ({
  visible,
  onClose,
  videoId,
}: {
  visible: boolean
  onClose: () => void
  videoId: number
}) => {
  const { playlists, isLoading } = useMyPlaylists()
  const addVideo = useAddVideoToPlaylist()
  const createPlaylist = useCreatePlaylist()
  const [newName, setNewName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pendingPlaylistId, setPendingPlaylistId] = useState<number | null>(null)

  const itemCountOf = (p: Playlist) => p.items?.length ?? 0
  const containsVideo = (p: Playlist) =>
    (p.items ?? []).some((it) => (typeof it === 'number' ? it : it.id) === videoId)

  const handleAdd = (playlist: Playlist) => {
    // 補-8-1-3: 送信中の二重タップを防ぐ
    if (addVideo.isPending) return
    if (containsVideo(playlist)) {
      setMessage('すでに追加されています')
      return
    }
    if (itemCountOf(playlist) >= MAX_PLAYLIST_ITEMS) {
      setMessage(`1つのプレイリストには最大${MAX_PLAYLIST_ITEMS}本までです`)
      return
    }
    setPendingPlaylistId(playlist.id)
    addVideo.mutate(
      { playlist, videoId },
      {
        onSuccess: () => setMessage(`「${playlist.name}」に追加しました`),
        onError: (e) => setMessage(mutationErrorMessage(e)),
        onSettled: () => setPendingPlaylistId(null),
      },
    )
  }

  const handleCreate = () => {
    if (createPlaylist.isPending) return
    const name = newName.trim()
    if (!name) return
    if (playlists.length >= MAX_PLAYLISTS_PER_OWNER) {
      setMessage(`プレイリストは最大${MAX_PLAYLISTS_PER_OWNER}件までです`)
      return
    }
    createPlaylist.mutate(
      { name, firstVideoId: videoId },
      {
        onSuccess: () => {
          setNewName('')
          setMessage(`「${name}」を作成して追加しました`)
        },
        onError: (e) => setMessage(mutationErrorMessage(e)),
      },
    )
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Txt weight="bold" size="lg" style={{ marginBottom: space.md }}>
        プレイリストに追加
      </Txt>

      {message ? (
        <Txt size="sm" color={colors.primary} style={{ marginBottom: space.sm }}>
          {message}
        </Txt>
      ) : null}

      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(p) => String(p.id)}
          style={{ maxHeight: 240 }}
          ListEmptyComponent={
            <Txt size="sm" color={colors.textMuted}>
              プレイリストはまだありません。下から作成できます。
            </Txt>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleAdd(item)}
              disabled={pendingPlaylistId === item.id}
              style={[styles.row, pendingPlaylistId === item.id && { opacity: 0.5 }]}
            >
              <Txt style={{ flex: 1 }}>{item.name}</Txt>
              <Txt size="xs" color={colors.textMuted}>
                {itemCountOf(item)}/{MAX_PLAYLIST_ITEMS}
                {containsVideo(item) ? '・追加済み' : ''}
              </Txt>
            </Pressable>
          )}
        />
      )}

      <View style={styles.createRow}>
        <TextField
          placeholder="新しいプレイリスト名"
          value={newName}
          onChangeText={setNewName}
          containerStyle={{ flex: 1 }}
        />
        <Button title="作成" onPress={handleCreate} loading={createPlaylist.isPending} />
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  createRow: { flexDirection: 'row', gap: space.sm, marginTop: space.lg, alignItems: 'flex-end' },
})
