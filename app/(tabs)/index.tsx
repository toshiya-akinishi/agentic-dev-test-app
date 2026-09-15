import React from 'react'
import { ScrollView } from 'react-native'

import { EmptyState } from '../../src/components/ui'

/** ホーム — 実装は後続 Epic で差し替える（EP-04 の骨組み） */
export default function Screen() {
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <EmptyState title="ホーム" description="この画面は後続の Epic で実装します。" />
    </ScrollView>
  )
}
