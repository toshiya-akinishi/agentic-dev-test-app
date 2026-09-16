/**
 * 施設ピンタップ時のボトムシート（T-08-5 / 補-1-22-2）。
 * 名称・写真・営業時間・説明を表示する。type=food/goods の場合は
 * メニュー（名前・価格・写真）も表示する（T-08-8 / 補-1-25-1）。
 */
import { Image } from 'expo-image'
import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { Sheet, Txt } from '../../components/ui'
import { mediaUrl } from '../common'
import { FACILITY_META } from '../../lib/venue'
import { colors, radius, space } from '../../theme'
import type { VenueFacility } from '../../types/payload'

export const FacilityDetailSheet = ({
  facility,
  onClose,
}: {
  facility: VenueFacility | undefined
  onClose: () => void
}) => {
  const meta = facility ? FACILITY_META[facility.type] : undefined
  const photo = facility ? mediaUrl(facility.photo, 'card') : undefined
  const menuItems = facility?.menuItems ?? []

  return (
    <Sheet visible={Boolean(facility)} onClose={onClose}>
      {facility && meta ? (
        <ScrollView style={{ maxHeight: 480 }}>
          {photo ? <Image source={{ uri: photo }} contentFit="cover" style={styles.photo} /> : null}

          <View style={styles.headRow}>
            <View style={[styles.iconWrap, { backgroundColor: meta.color }]}>
              <Txt size="lg">{meta.icon}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt weight="bold" size="lg">
                {facility.name}
              </Txt>
              <Txt size="sm" color={colors.textSub}>
                {meta.label}
              </Txt>
            </View>
          </View>

          {facility.openHours ? (
            <Txt size="sm" color={colors.textSub} style={{ marginTop: space.sm }}>
              営業時間: {facility.openHours}
            </Txt>
          ) : null}

          {facility.description ? (
            <Txt size="sm" style={{ marginTop: space.sm }}>
              {facility.description}
            </Txt>
          ) : null}

          {menuItems.length > 0 ? (
            <View style={{ marginTop: space.lg, gap: space.sm }}>
              <Txt weight="bold" size="sm" color={colors.textSub}>
                メニュー
              </Txt>
              {menuItems.map((item) => {
                const itemPhoto = mediaUrl(item.photo, 'thumb')
                return (
                  <View key={item.id ?? item.name} style={styles.menuRow}>
                    {itemPhoto ? (
                      <Image source={{ uri: itemPhoto }} contentFit="cover" style={styles.menuPhoto} />
                    ) : (
                      <View style={[styles.menuPhoto, styles.menuPhotoFallback]} />
                    )}
                    <Txt style={{ flex: 1 }}>{item.name}</Txt>
                    {typeof item.price === 'number' ? (
                      <Txt weight="bold">{item.price.toLocaleString('ja-JP')}円</Txt>
                    ) : null}
                  </View>
                )
              })}
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  photo: { width: '100%', height: 160, borderRadius: radius.md, backgroundColor: colors.bgSubtle, marginBottom: space.md },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconWrap: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  menuPhoto: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.bgSubtle },
  menuPhotoFallback: {},
})
