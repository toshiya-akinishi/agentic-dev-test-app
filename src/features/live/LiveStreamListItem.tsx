/**
 * 同時配信一覧の行（補-2-2-2: 他の配信への切替）。
 */
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Badge, Txt } from '../../components/ui'
import { LIVE_KIND_LABELS } from '../../queries/liveStreams'
import { colors, space } from '../../theme'
import type { LiveStream } from '../../types/payload'

const STATUS_LABEL: Record<LiveStream['status'], string> = {
  live: '配信中',
  scheduled: '配信予定',
  ended: 'アーカイブ',
}

export const LiveStreamListItem = ({
  stream,
  active,
  onPress,
}: {
  stream: LiveStream
  active: boolean
  onPress: () => void
}) => (
  <Pressable onPress={onPress} style={[styles.row, active && styles.rowActive]}>
    <View style={{ flex: 1 }}>
      <Txt weight={active ? 'bold' : 'regular'} numberOfLines={1}>
        {stream.title}
      </Txt>
      <Txt size="xs" color={colors.textMuted}>
        {LIVE_KIND_LABELS[stream.kind]}
      </Txt>
    </View>
    <Badge
      label={STATUS_LABEL[stream.status]}
      color={stream.status === 'live' ? colors.textInverse : colors.textSub}
      bg={stream.status === 'live' ? colors.live : colors.bgSubtle}
    />
  </Pressable>
)

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowActive: { backgroundColor: '#EAF3EC' },
})
