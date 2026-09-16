/**
 * ギャラリーバス（T-08-3 / 1-15 / 補-1-15-1）。
 * 乗降場所（名称）・時刻表（次の発車を強調）・運賃を表示する。
 * 往路/復路や所要時間は CMS 側で `name`（例: 「○○駅→会場」）/ `note` に記載される前提で、
 * `transport-infos`（type=gallery_bus）のドキュメント単位でカード表示する。
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Card, Txt } from '../../components/ui'
import { RichText } from '../../lib/richtext'
import { nextDepartureIndex } from '../../lib/venue'
import { colors, radius, space } from '../../theme'
import type { TransportInfo } from '../../types/payload'

export const GalleryBusSection = ({ buses }: { buses: TransportInfo[] }) => {
  if (!buses.length) return null

  return (
    <Card style={{ gap: space.lg }}>
      <Txt weight="bold">ギャラリーバス</Txt>
      {buses.map((bus) => {
        const nextIdx = nextDepartureIndex(bus.timetable)
        return (
          <View key={bus.id} style={{ gap: space.xs }}>
            <View style={styles.headRow}>
              <Txt weight="medium" style={{ flex: 1 }}>
                🚌 {bus.name}
              </Txt>
              {bus.fee ? <Txt size="sm" color={colors.textSub}>{bus.fee}</Txt> : null}
            </View>
            {bus.note ? <RichText value={bus.note} /> : null}
            {bus.timetable?.length ? (
              <View style={styles.timetableWrap}>
                {bus.timetable.map((entry, i) => {
                  const isNext = i === nextIdx
                  return (
                    <View
                      key={entry.id ?? `${entry.time}-${i}`}
                      style={[styles.chip, isNext && styles.chipNext]}
                    >
                      <Txt size="sm" weight={isNext ? 'bold' : 'regular'} color={isNext ? colors.textInverse : colors.text}>
                        {entry.time}
                      </Txt>
                      {isNext ? (
                        <Txt size="xs" color={colors.textInverse}>
                          次の発車
                        </Txt>
                      ) : null}
                      {entry.note ? (
                        <Txt size="xs" color={isNext ? colors.textInverse : colors.textMuted}>
                          {entry.note}
                        </Txt>
                      ) : null}
                    </View>
                  )
                })}
              </View>
            ) : null}
          </View>
        )
      })}
    </Card>
  )
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center' },
  timetableWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.bgSubtle,
    minWidth: 64,
    alignItems: 'center',
  },
  chipNext: { backgroundColor: colors.primary },
})
