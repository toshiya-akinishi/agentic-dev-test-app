/**
 * ホール全景の写真/イラスト切替（T-08-10 / 1-20 / 補-1-20-1）。
 * どちらか一方のみの場合はタブを出さない。
 */
import { Image } from 'expo-image'
import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Tabs, Txt } from '../../components/ui'
import { mediaUrl } from '../common'
import { useAdaptiveImageSize } from '../../lib/network'
import { colors, radius } from '../../theme'
import type { Hole } from '../../types/payload'

export const HolePhotoToggle = ({ hole }: { hole: Hole }) => {
  /** 補-8-2-1(d): 低速時は hero ではなく card サイズを読み込む */
  const imageSize = useAdaptiveImageSize('hero')
  const photoUrl = mediaUrl(hole.photo, imageSize)
  const illustrationUrl = mediaUrl(hole.illustration, imageSize)
  const [mode, setMode] = useState<'photo' | 'illustration'>(photoUrl ? 'photo' : 'illustration')

  const url = mode === 'photo' ? photoUrl : illustrationUrl
  if (!photoUrl && !illustrationUrl) return null

  return (
    <View style={{ gap: 8 }}>
      {photoUrl && illustrationUrl ? (
        <Tabs
          value={mode}
          onChange={setMode}
          options={[
            { value: 'photo', label: '写真' },
            { value: 'illustration', label: 'イラスト' },
          ]}
        />
      ) : null}
      {url ? (
        <Image source={{ uri: url }} contentFit="cover" style={styles.image} />
      ) : (
        <View style={[styles.image, styles.fallback]}>
          <Txt color={colors.textMuted}>画像がありません</Txt>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  image: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, backgroundColor: colors.bgSubtle },
  fallback: { alignItems: 'center', justifyContent: 'center' },
})
