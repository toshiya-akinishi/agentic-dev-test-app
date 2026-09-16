/**
 * 通知センターの1行（T-14-11 / 要求 6-17 / 補-6-17-1〜3）。
 * 緊急通知は未読の間、赤枠 + 🚨 で他と明確に区別する（サーバー側の並べ替え pin と対の見た目）。
 */
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { formatRelative } from '../../lib/format'
import type { NotificationCenterItem } from '../../queries/notifications'
import { colors, radius, space } from '../../theme'

const TYPE_ICON: Record<NotificationCenterItem['type'], string> = {
  emergency: '🚨',
  player_event: '⛳',
  start_reminder: '⏰',
  title_race: '🏆',
  news: '📰',
  cut_line: '✂️',
}

const TYPE_LABEL: Record<NotificationCenterItem['type'], string> = {
  emergency: '緊急',
  player_event: '選手',
  start_reminder: 'リマインド',
  title_race: '優勝争い',
  news: 'ニュース',
  cut_line: 'カットライン',
}

export const NotificationRow = ({
  notification,
  onPress,
}: {
  notification: NotificationCenterItem
  onPress: () => void
}) => {
  const isPinnedEmergency = notification.pinned && notification.type === 'emergency'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isPinnedEmergency && styles.rowEmergency,
        pressed && { opacity: 0.7 },
      ]}
    >
      {!notification.read ? <View style={styles.unreadDot} /> : <View style={styles.unreadDotSpacer} />}
      <Txt size="xl">{TYPE_ICON[notification.type] ?? '🔔'}</Txt>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.headerRow}>
          <Txt
            size="xs"
            weight="bold"
            color={isPinnedEmergency ? colors.textInverse : colors.textMuted}
            style={isPinnedEmergency ? styles.badgeEmergency : styles.badge}
          >
            {TYPE_LABEL[notification.type] ?? '通知'}
          </Txt>
          <Txt size="xs" color={isPinnedEmergency ? colors.textInverse : colors.textMuted}>
            {formatRelative(notification.sentAt)}
          </Txt>
        </View>
        <Txt weight={notification.read ? 'regular' : 'bold'} color={isPinnedEmergency ? colors.textInverse : colors.text}>
          {notification.title}
        </Txt>
        <Txt
          size="sm"
          color={isPinnedEmergency ? colors.textInverse : colors.textSub}
          numberOfLines={2}
        >
          {notification.body}
        </Txt>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowEmergency: {
    backgroundColor: colors.danger,
    borderBottomColor: colors.danger,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    backgroundColor: colors.bgSubtle,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  badgeEmergency: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: space.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.info,
    marginTop: 6,
  },
  unreadDotSpacer: { width: 8, height: 8, marginTop: 6 },
})
