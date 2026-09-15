import React from 'react'
import { ScrollView } from 'react-native'

import { EmptyState } from '../../src/components/ui'

/** 大会一覧 — 実装は後続 Epic で差し替える（EP-04 の骨組み） */
export default function Screen() {
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <EmptyState title="大会一覧" description="この画面は後続の Epic で実装します。" />
    </ScrollView>
  )
}
