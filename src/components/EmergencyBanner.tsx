/** 緊急バナー（1-23 / 補-1-23-4）。中止・順延・中断中は常時表示する。 */
import { useAtomValue } from 'jotai'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { emergencyBannerAtom } from '../store/ui'
import { colors, space } from '../theme'
import { Txt } from './ui'

export const EmergencyBanner = () => {
  const banner = useAtomValue(emergencyBannerAtom)
  const insets = useSafeAreaInsets()
  const router = useRouter()

  if (!banner) return null

  return (
    <Pressable
      accessibilityRole="alert"
      onPress={() => router.push('/notifications')}
      style={[styles.bar, { paddingTop: insets.top + space.sm }]}
    >
      <View style={styles.row}>
        <Txt size="sm" weight="bold" color={colors.textInverse}>
          ⚠️ {banner.title}
        </Txt>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.danger,
    paddingBottom: space.md,
    paddingHorizontal: space.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
})
