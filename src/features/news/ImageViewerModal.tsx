/**
 * 画像タップで開く全画面ビューア（補-1-10-1）。
 * ニュース詳細のリッチテキスト内画像から利用する。
 */
import { Image } from 'expo-image'
import React from 'react'
import { Modal, Pressable, StyleSheet } from 'react-native'

import { Txt } from '../../components/ui'
import { colors, space } from '../../theme'
import type { RichTextImage } from '../../lib/richtext'

export const ImageViewerModal = ({
  image,
  onClose,
}: {
  image: RichTextImage | null
  onClose: () => void
}) => (
  <Modal visible={image !== null} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={styles.backdrop} onPress={onClose}>
      {image ? (
        <Image
          source={{ uri: image.url }}
          contentFit="contain"
          accessibilityLabel={image.alt}
          style={styles.image}
        />
      ) : null}
      <Txt size="sm" color={colors.textInverse} style={styles.hint}>
        タップで閉じる
      </Txt>
    </Pressable>
  </Modal>
)

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    gap: space.lg,
  },
  image: { width: '100%', height: '75%' },
  hint: { opacity: 0.8 },
})
