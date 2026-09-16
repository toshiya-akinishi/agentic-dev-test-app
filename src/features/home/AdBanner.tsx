/**
 * 広告枠（8-3）。`home_top_banner` / `home_inline` から使う。
 * 補-8-5-1: クリエイティブが未設定/取得失敗のときは枠ごと非表示にする（空白のプレースホルダーを出さない）。
 * ホームの 2 枠は `AdSlot.format = banner` 運用のため、`image` を持つクリエイティブのみ描画する。
 * video / tieup_article はホームでは未使用のため、将来 EP-15/EP-16 で必要になった時点で拡張する。
 */
import { Image } from 'expo-image'
import React from 'react'
import { Linking, Pressable, StyleSheet } from 'react-native'

import { mediaUrl } from '../common'
import { useAdSlot } from '../../queries/ads'
import { colors, radius, space } from '../../theme'

export const AdBanner = ({ slot }: { slot: string }) => {
  const { data } = useAdSlot(slot)

  if (!data) return null
  const imageUrl = mediaUrl(data.image, 'card')
  if (!imageUrl) return null

  const onPress = () => {
    const url = data.linkUrl ?? undefined
    if (url) void Linking.openURL(url).catch(() => undefined)
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.wrap}>
      <Image source={{ uri: imageUrl }} contentFit="cover" style={styles.image} accessibilityLabel={data.name} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: space.lg, marginTop: space.lg },
  image: {
    width: '100%',
    aspectRatio: 320 / 100,
    borderRadius: radius.md,
    backgroundColor: colors.bgSubtle,
  },
})
