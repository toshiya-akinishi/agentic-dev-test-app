/**
 * 公式ストア商品カルーセル（T-08-12 / 1-26 / 補-1-26-1）。
 * 購入は外部ECへ遷移する（アプリ内決済なし）。
 *
 * CMSギャップ注記: `tournaments` には `officialStoreUrl`（外部EC URL）しか無く、
 * 商品カルーセル用の専用コレクションはまだ無い。そのため会場のグッズ売店
 * （`venue-facilities` type=goods の `menuItems`：写真・価格を持つ）を商品紹介の代替ソースとして
 * 再利用する（1-25のグルメ・お土産情報とは別に、代表商品カルーセルとして横スクロール表示する）。
 */
import { Image } from 'expo-image'
import React from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { Card, Txt } from '../../components/ui'
import { mediaUrl } from '../common'
import { colors, radius, space } from '../../theme'
import type { VenueFacility } from '../../types/payload'

type Product = { name: string; price?: number | null; photoUrl?: string; key: string }

export const StoreCarousel = ({
  goodsFacilities,
  officialStoreUrl,
}: {
  goodsFacilities: VenueFacility[]
  officialStoreUrl?: string | null
}) => {
  const products: Product[] = goodsFacilities.flatMap((f) =>
    (f.menuItems ?? []).map((item, i) => ({
      key: item.id ?? `${f.id}-${i}`,
      name: item.name,
      price: item.price,
      photoUrl: mediaUrl(item.photo, 'card'),
    })),
  )

  if (!products.length && !officialStoreUrl) return null

  const open = () => {
    if (officialStoreUrl) void Linking.openURL(officialStoreUrl)
  }

  return (
    <Card style={{ gap: space.md, paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: space.lg, gap: space.xs }}>
        <Txt weight="bold">公式ストア</Txt>
        <Txt size="sm" color={colors.textSub}>
          大会オフィシャルグッズです。購入は外部ストアに移動します（アプリ内決済はありません）。
        </Txt>
      </View>

      {products.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {products.map((p) => (
            <Pressable key={p.key} style={styles.card} onPress={open} disabled={!officialStoreUrl}>
              {p.photoUrl ? (
                <Image source={{ uri: p.photoUrl }} contentFit="cover" style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoFallback]} />
              )}
              <Txt size="sm" weight="medium" numberOfLines={2} style={{ marginTop: space.xs }}>
                {p.name}
              </Txt>
              {typeof p.price === 'number' ? (
                <Txt size="sm" weight="bold" color={colors.primary}>
                  {p.price.toLocaleString('ja-JP')}円
                </Txt>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {officialStoreUrl ? (
        <Pressable onPress={open} style={{ paddingHorizontal: space.lg }}>
          <Txt size="sm" color={colors.primary} weight="medium">
            公式ストアを見る ›
          </Txt>
        </Pressable>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg },
  card: { width: 120 },
  photo: { width: 120, height: 120, borderRadius: radius.md, backgroundColor: colors.bgSubtle },
  photoFallback: {},
})
