/**
 * 動画シェアボタン（2-21 / 補-2-21-1, 2 / ADR-009）。
 * OS 標準シェアシートで Web 視聴ページ URL のみを共有する。DL・書き出しは提供しない。
 */
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { Txt } from '../../components/ui'
import { shareVideo } from '../../lib/share'
import { radius } from '../../theme'
import type { Video } from '../../types/payload'

export const ShareButton = ({
  video,
  size = 'md',
}: {
  video: Pick<Video, 'shareUrl' | 'slug' | 'title'>
  size?: 'sm' | 'md'
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="シェア"
    onPress={() => void shareVideo(video)}
    style={[styles.btn, size === 'sm' && styles.btnSm]}
    hitSlop={8}
  >
    <Txt size={size === 'sm' ? 'sm' : 'md'}>📤</Txt>
  </Pressable>
)

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSm: { width: 30, height: 30 },
})
