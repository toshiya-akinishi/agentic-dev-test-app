/**
 * 大会詳細のタブ切替（補-1-8-1: 概要 / リーダーボード / 組み合わせ / コース / 会場マップ / ニュース）。
 * EP-07 が担当するのは 概要・組み合わせ。ニュースは EP-06 の一覧フックを再利用して有効化した。
 * リーダーボード（EP-10）・コース・会場マップ（EP-08）はこの Epic の対象外のため、
 * タブ自体は仕様どおり表示しつつ、選択時は「準備中」を案内して他 Epic のルートには遷移しない。
 */
import { router } from 'expo-router'
import React from 'react'
import { Alert } from 'react-native'

import { Tabs } from '../../components/ui'

export type TournamentTabKey = 'overview' | 'leaderboard' | 'pairings' | 'course' | 'map' | 'news'

const TAB_DEFS: Array<{ key: TournamentTabKey; label: string; enabled: boolean }> = [
  { key: 'overview', label: '概要', enabled: true },
  { key: 'leaderboard', label: 'リーダーボード', enabled: false },
  { key: 'pairings', label: '組み合わせ', enabled: true },
  { key: 'course', label: 'コース', enabled: false },
  { key: 'map', label: '会場マップ', enabled: false },
  { key: 'news', label: 'ニュース', enabled: true },
]

export const TournamentTabs = ({
  tournamentId,
  active,
}: {
  tournamentId: string
  active: TournamentTabKey
}) => {
  const go = (key: TournamentTabKey) => {
    if (key === active) return
    const def = TAB_DEFS.find((t) => t.key === key)
    if (!def?.enabled) {
      Alert.alert('準備中', `「${def?.label}」は他の Epic で実装予定の機能です。`)
      return
    }
    const path = key === 'overview' ? `/tournament/${tournamentId}` : `/tournament/${tournamentId}/${key}`
    router.replace(path)
  }

  return (
    <Tabs
      scrollable
      value={active}
      options={TAB_DEFS.map((t) => ({ value: t.key, label: t.label }))}
      onChange={go}
    />
  )
}
