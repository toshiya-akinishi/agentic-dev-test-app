/**
 * 動画一覧 `/videos`（T-12-1 / 要求 2-8, 2-10 / 補-2-8-1〜3）。
 * EP-04 のスタブを実装で置き換える。
 * 構成: ストーリー用の丸サムネ列(2-12・タップで /stories) / ライブ配信導線(2-1, 2-2) /
 *       フィルタバー（6軸 + タグチップ + 並び順） / 2列グリッド・無限スクロール。
 */
import { router } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useCallback } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'

import { EmptyState, ErrorView, SkeletonList, Txt } from '../../src/components/ui'
import { StoryThumbRow, VideoCard, VideoFilterBar } from '../../src/features/videos'
import { useLiveStreams } from '../../src/queries/liveStreams'
import { useVideoList } from '../../src/queries/videos'
import { videoFiltersAtom } from '../../src/store/ui'
import { colors, space } from '../../src/theme'
import type { Video } from '../../src/types/payload'

export default function VideosScreen() {
  const [filters, setFilters] = useAtom(videoFiltersAtom)
  const { items, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useVideoList(filters)
  const { streams } = useLiveStreams()
  const liveNow = streams.find((s) => s.status === 'live') ?? streams[0]

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const renderItem = useCallback(
    ({ item }: { item: Video }) => (
      <View style={styles.cell}>
        <VideoCard video={item} onPress={() => router.push(`/video/${item.id}`)} />
      </View>
    ),
    [],
  )

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(v) => String(v.id)}
        numColumns={2}
        columnWrapperStyle={styles.columnWrap}
        contentContainerStyle={styles.content}
        onEndReachedThreshold={0.4}
        onEndReached={onEndReached}
        ListHeaderComponent={
          <View>
            <StoryThumbRow />
            {liveNow ? (
              <Pressable style={styles.liveBanner} onPress={() => router.push(`/live/${liveNow.id}`)}>
                <View style={styles.liveDot} />
                <Txt size="sm" weight="bold" color={colors.textInverse} style={{ flex: 1 }}>
                  {liveNow.status === 'live' ? 'ライブ配信中' : 'ライブ配信'} — {liveNow.title}
                </Txt>
                <Txt size="sm" color={colors.textInverse}>
                  見る ›
                </Txt>
              </Pressable>
            ) : null}
            <VideoFilterBar filters={filters} onChange={setFilters} />
          </View>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonList rows={6} />
          ) : error ? (
            <ErrorView error={error} onRetry={() => void refetch()} />
          ) : (
            <EmptyState icon="🎬" title="動画が見つかりません" description="フィルタ条件を変更してお試しください。" />
          )
        }
        ListFooterComponent={isFetchingNextPage ? <SkeletonList rows={2} /> : null}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: space.xxl },
  columnWrap: { gap: space.md, paddingHorizontal: space.lg },
  cell: { flex: 1, marginBottom: space.lg },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.live,
    marginHorizontal: space.lg,
    marginTop: space.md,
    padding: space.md,
    borderRadius: 12,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
})
