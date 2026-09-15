/** タブナビゲーション 5種（T-04-2 / docs/04-screen-spec.md 1章） */
import { Tabs } from 'expo-router'
import { useAtomValue } from 'jotai'
import React from 'react'
import { Text, type ColorValue } from 'react-native'

import { unreadNotificationCountAtom } from '../../src/store/ui'
import { colors } from '../../src/theme'

const Icon = ({ emoji, color }: { emoji: string; color: ColorValue }) => (
  <Text style={{ fontSize: 22, color }}>{emoji}</Text>
)

export default function TabsLayout() {
  const unread = useAtomValue(unreadNotificationCountAtom)

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { fontSize: 17, fontWeight: '700', color: colors.text },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color }) => <Icon emoji="🏠" color={color} />,
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen
        name="tournaments"
        options={{
          title: '大会',
          tabBarIcon: ({ color }) => <Icon emoji="🏆" color={color} />,
        }}
      />
      <Tabs.Screen
        name="videos"
        options={{
          title: '動画',
          tabBarIcon: ({ color }) => <Icon emoji="▶️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="players"
        options={{
          title: '選手',
          tabBarIcon: ({ color }) => <Icon emoji="⛳" color={color} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: 'マイページ',
          tabBarIcon: ({ color }) => <Icon emoji="👤" color={color} />,
        }}
      />
    </Tabs>
  )
}
