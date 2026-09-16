/**
 * 選手詳細「使用ギア」タブ（T-13-3 / 4-6 / 補-4-6-1, 2）。
 * カテゴリごとにブランド・モデル・写真を表示し、ユーザー自身の `golfClubSetting`
 * （マイページで設定済み）と同カテゴリ・同ブランドなら「自分と同じ」バッジを出す。
 */
import { Image } from 'expo-image'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Badge, Txt } from '../../components/ui'
import { mediaUrl } from '../common'
import { EQUIPMENT_CATEGORY_LABELS, EQUIPMENT_CATEGORY_ORDER, isSameAsMyGear } from '../../queries/players'
import { colors, radius, space } from '../../theme'
import type { Player, User } from '../../types/payload'

export const PlayerGearList = ({
  equipment,
  mySettings,
}: {
  equipment: NonNullable<Player['equipment']>
  mySettings: NonNullable<User['golfClubSetting']> | null | undefined
}) => {
  const sorted = [...equipment].sort(
    (a, b) => EQUIPMENT_CATEGORY_ORDER.indexOf(a.category) - EQUIPMENT_CATEGORY_ORDER.indexOf(b.category),
  )

  return (
    <View style={styles.list}>
      {sorted.map((item, i) => {
        const photo = mediaUrl(item.photo, 'card')
        const same = isSameAsMyGear(item, mySettings)
        return (
          <View key={item.id ?? `${item.category}-${i}`} style={styles.row}>
            {photo ? (
              <Image source={{ uri: photo }} contentFit="cover" style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoFallback]}>
                <Txt size="xs">⛳</Txt>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Txt size="xs" color={colors.textMuted}>
                {EQUIPMENT_CATEGORY_LABELS[item.category]}
              </Txt>
              <Txt weight="medium">
                {item.brand}
                {item.model ? ` ${item.model}` : ''}
              </Txt>
            </View>
            {same ? <Badge label="自分と同じ" color={colors.textInverse} bg={colors.primary} /> : null}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: space.md, padding: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  photo: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.bgSubtle },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
})
