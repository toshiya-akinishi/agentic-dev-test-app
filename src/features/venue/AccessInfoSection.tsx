/**
 * 現地アクセス情報（T-08-1 / 1-17 / 補-1-17-1: 電車 / 車 / シャトルバス の3セクション）。
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Card, Txt } from '../../components/ui'
import { RichText } from '../../lib/richtext'
import { nextDepartureIndex } from '../../lib/venue'
import { colors, radius, space } from '../../theme'
import type { TransportInfo, Venue } from '../../types/payload'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: space.xs }}>
    <Txt weight="bold" size="sm" color={colors.textSub}>
      {title}
    </Txt>
    {children}
  </View>
)

const ShuttleTimetable = ({ timetable }: { timetable: NonNullable<TransportInfo['timetable']> }) => {
  const nextIdx = nextDepartureIndex(timetable)
  return (
    <View style={styles.timetableWrap}>
      {timetable.map((entry, i) => {
        const isNext = i === nextIdx
        return (
          <View key={entry.id ?? `${entry.time}-${i}`} style={[styles.timetableChip, isNext && styles.timetableChipNext]}>
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
  )
}

export const AccessInfoSection = ({
  venue,
  shuttleInfos,
}: {
  venue: Venue | undefined
  shuttleInfos: TransportInfo[]
}) => {
  if (!venue) return null
  const hasTrain = Boolean(venue.accessTrain)
  const hasCar = Boolean(venue.accessCar)
  const shuttleTimetables = shuttleInfos.filter((s) => s.timetable?.length)
  const fallbackShuttle = !shuttleTimetables.length ? venue.shuttleTimetable : undefined

  if (!hasTrain && !hasCar && !shuttleTimetables.length && !fallbackShuttle?.length) return null

  return (
    <Card style={{ gap: space.lg }}>
      <Txt weight="bold">現地へのアクセス</Txt>

      {hasTrain ? (
        <Section title="電車">
          <RichText value={venue.accessTrain} />
        </Section>
      ) : null}

      {hasCar ? (
        <Section title="車">
          <RichText value={venue.accessCar} />
        </Section>
      ) : null}

      {shuttleTimetables.length > 0 ? (
        <Section title="シャトルバス">
          {shuttleTimetables.map((s) => (
            <View key={s.id} style={{ gap: space.xs }}>
              <Txt size="sm" weight="medium">
                {s.name}
                {s.fee ? ` ・ ${s.fee}` : ''}
              </Txt>
              <ShuttleTimetable timetable={s.timetable ?? []} />
            </View>
          ))}
        </Section>
      ) : fallbackShuttle?.length ? (
        <Section title="シャトルバス（会場常設）">
          <ShuttleTimetable
            timetable={fallbackShuttle.map((t) => ({ time: t.time, note: t.note, id: t.id }))}
          />
        </Section>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  timetableWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  timetableChip: {
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.bgSubtle,
    minWidth: 64,
    alignItems: 'center',
  },
  timetableChipNext: { backgroundColor: colors.primary },
})
