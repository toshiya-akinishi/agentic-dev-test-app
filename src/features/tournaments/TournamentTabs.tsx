/**
 * 大会詳細のタブ切替（補-1-8-1: 概要 / リーダーボード / 組み合わせ / コース / 会場マップ / ニュース）。
 * EP-07 が担当するのは 概要・組み合わせ。ニュースは EP-06 の一覧フックを再利用して有効化した。
 * リーダーボード（EP-10 / T-10-1）は本 Epic で実装し有効化した。
 * コース（T-08-9, T-08-10）・会場マップ（T-08-5〜T-08-8, T-08-12）は EP-08 で実装し有効化した。
 */
import { router } from 'expo-router'
import React from 'react'

import { Tabs } from '../../components/ui'

export type TournamentTabKey = 'overview' | 'leaderboard' | 'pairings' | 'course' | 'map' | 'news'

const TAB_DEFS: Array<{ key: TournamentTabKey; label: string }> = [
  { key: 'overview', label: '概要' },
  { key: 'leaderboard', label: 'リーダーボード' },
  { key: 'pairings', label: '組み合わせ' },
  { key: 'course', label: 'コース' },
  { key: 'map', label: '会場マップ' },
  { key: 'news', label: 'ニュース' },
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
