/**
 * オフライン表示バー（補-8-1-2）と低速モード表示（8-2）。
 * `lastUpdated` を渡さない場合は、オフライン対応対象（`PERSISTED_KEY_ROOTS`）の
 * クエリキャッシュのうち最も新しい `dataUpdatedAt` を自動で拾って表示する
 * （画面ごとに最終更新時刻を計算して渡す必要がないようにするため）。
 */
import { useQueryClient } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { PERSISTED_KEY_ROOTS } from '../queries/keys'
import { effectiveQualityAtom } from '../store/network'
import { colors, font, space } from '../theme'
import { Txt } from './ui'

/** オフライン対応対象クエリのうち最新の取得時刻（ms epoch）を返す */
const latestPersistedUpdate = (
  queryClient: ReturnType<typeof useQueryClient>,
): number | undefined => {
  let max = 0
  for (const query of queryClient.getQueryCache().getAll()) {
    const root = query.queryKey[0]
    if (typeof root !== 'string' || !PERSISTED_KEY_ROOTS.has(root)) continue
    if (query.state.dataUpdatedAt > max) max = query.state.dataUpdatedAt
  }
  return max > 0 ? max : undefined
}

const useAutoLastUpdated = (): Date | null => {
  const queryClient = useQueryClient()
  const [ts, setTs] = useState<number | undefined>(() => latestPersistedUpdate(queryClient))

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      setTs(latestPersistedUpdate(queryClient))
    })
    return unsubscribe
  }, [queryClient])

  return ts ? new Date(ts) : null
}

export const OfflineBar = ({ lastUpdated }: { lastUpdated?: Date | null }) => {
  const quality = useAtomValue(effectiveQualityAtom)
  const autoLastUpdated = useAutoLastUpdated()
  if (quality === 'good') return null

  const isOffline = quality === 'offline'
  const effectiveLastUpdated = lastUpdated ?? autoLastUpdated
  const time = effectiveLastUpdated
    ? `${String(effectiveLastUpdated.getHours()).padStart(2, '0')}:${String(effectiveLastUpdated.getMinutes()).padStart(2, '0')}`
    : null

  return (
    <View style={[styles.bar, { backgroundColor: isOffline ? colors.textSub : colors.warning }]}>
      <Txt size="xs" weight="bold" color={colors.textInverse}>
        {isOffline
          ? `オフライン表示中${time ? `（最終更新 ${time}）` : ''}`
          : '低速モード：動画の自動再生を停止しています'}
      </Txt>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
})
