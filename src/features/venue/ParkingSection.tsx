/**
 * 駐車場情報（T-08-4 / 1-16 / 補-1-16-1, 2・SIMPL）。
 * 場所・収容台数・料金・利用方法（リッチテキスト）+ 混雑ステータス（CMSから手動更新・自動計測なし）。
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Badge, Card, Txt } from '../../components/ui'
import { RichText } from '../../lib/richtext'
import { OCCUPANCY_META } from '../../lib/venue'
import { colors, space } from '../../theme'
import type { TransportInfo } from '../../types/payload'

export const ParkingSection = ({ lots }: { lots: TransportInfo[] }) => {
  if (!lots.length) return null

  return (
    <Card style={{ gap: space.lg }}>
      <Txt weight="bold">駐車場</Txt>
      {lots.map((lot) => {
        const occupancy = lot.occupancyStatus ? OCCUPANCY_META[lot.occupancyStatus] : undefined
        return (
          <View key={lot.id} style={{ gap: space.xs }}>
            <View style={styles.headRow}>
              <Txt weight="medium" style={{ flex: 1 }}>
                🅿️ {lot.name}
              </Txt>
              {occupancy ? <Badge label={occupancy.label} color={occupancy.color} bg={occupancy.bg} /> : null}
            </View>
            <View style={styles.metaRow}>
              {typeof lot.capacity === 'number' ? (
                <Txt size="sm" color={colors.textSub}>
                  収容台数 {lot.capacity.toLocaleString('ja-JP')}台
                </Txt>
              ) : null}
              {lot.fee ? (
                <Txt size="sm" color={colors.textSub}>
                  料金 {lot.fee}
                </Txt>
              ) : null}
            </View>
            {lot.note ? <RichText value={lot.note} /> : null}
          </View>
        )
      })}
    </Card>
  )
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center' },
  metaRow: { flexDirection: 'row', gap: space.lg },
})
