/** オフライン表示バー（補-8-1-2）と低速モード表示（8-2） */
import { useAtomValue } from 'jotai'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { effectiveQualityAtom } from '../store/network'
import { colors, font, space } from '../theme'
import { Txt } from './ui'

export const OfflineBar = ({ lastUpdated }: { lastUpdated?: Date | null }) => {
  const quality = useAtomValue(effectiveQualityAtom)
  if (quality === 'good') return null

  const isOffline = quality === 'offline'
  const time = lastUpdated
    ? `${String(lastUpdated.getHours()).padStart(2, '0')}:${String(lastUpdated.getMinutes()).padStart(2, '0')}`
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
