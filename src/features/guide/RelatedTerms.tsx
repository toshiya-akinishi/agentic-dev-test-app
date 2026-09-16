/**
 * 用語詳細の関連用語リンク（補-1-2-2: 最大 5 件）。
 * 補-1-2-3 のとおり本文中の自動リンク化は行わず、CMS で設定された関連用語だけを出す。
 */
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { colors, radius, space } from '../../theme'
import type { GlossaryTerm } from '../../types/payload'

/** 補-1-2-2: 表示は最大 5 件 */
export const MAX_RELATED_TERMS = 5

/** depth によって ID のみのこともあるため、展開済みのものだけを表示する */
export const pickRelatedTerms = (
  related: (number | GlossaryTerm)[] | null | undefined,
): GlossaryTerm[] =>
  (related ?? [])
    .filter((t): t is GlossaryTerm => Boolean(t) && typeof t === 'object')
    .slice(0, MAX_RELATED_TERMS)

export const RelatedTerms = ({
  related,
  onSelect,
}: {
  related: (number | GlossaryTerm)[] | null | undefined
  onSelect: (term: GlossaryTerm) => void
}) => {
  const items = pickRelatedTerms(related)
  if (!items.length) return null

  return (
    <View style={styles.wrap}>
      <Txt weight="bold" size="md">
        関連用語
      </Txt>
      <View style={styles.chips}>
        {items.map((term) => (
          <Pressable
            key={term.id}
            accessibilityRole="link"
            onPress={() => onSelect(term)}
            style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
          >
            <Txt size="sm" weight="medium" color={colors.primary}>
              {term.term}
            </Txt>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.md, marginTop: space.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    backgroundColor: '#E7F1EA',
  },
})
