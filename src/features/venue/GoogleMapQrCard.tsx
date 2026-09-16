/**
 * Googleマップ導線 + QR表示（T-08-2 / 1-14 / 補-1-14-1・SIMPL）。
 * (a) タップで外部マップアプリを起動、(b) 「QRで表示」でアプリ内にQRを描画する
 * （紙媒体からの導線を想定。QRの読み取り検証自体は対象外）。
 */
import React, { useState } from 'react'
import QRCode from 'react-native-qrcode-svg'
import { Linking, StyleSheet, View } from 'react-native'

import { Button, Card, Sheet, Txt } from '../../components/ui'
import { colors, radius, space } from '../../theme'

export const GoogleMapQrCard = ({ googleMapUrl, venueName }: { googleMapUrl?: string | null; venueName?: string }) => {
  const [qrVisible, setQrVisible] = useState(false)
  if (!googleMapUrl) return null

  return (
    <Card style={{ gap: space.md }}>
      <Txt weight="bold">現地までのアクセス（Googleマップ）</Txt>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button title="マップを開く" style={{ flex: 1 }} onPress={() => void Linking.openURL(googleMapUrl)} />
        <Button title="QRで表示" variant="ghost" style={{ flex: 1 }} onPress={() => setQrVisible(true)} />
      </View>

      <Sheet visible={qrVisible} onClose={() => setQrVisible(false)}>
        <View style={styles.qrWrap}>
          <View style={styles.qrCard}>
            <QRCode value={googleMapUrl} size={200} />
          </View>
          <Txt weight="bold" style={{ marginTop: space.md, textAlign: 'center' }}>
            {venueName ?? '会場'}までの地図
          </Txt>
          <Txt size="xs" color={colors.textMuted} style={{ marginTop: space.xs, textAlign: 'center' }}>
            スマートフォンのカメラで読み取るとGoogleマップが開きます
          </Txt>
        </View>
      </Sheet>
    </Card>
  )
}

const styles = StyleSheet.create({
  qrWrap: { alignItems: 'center', paddingVertical: space.lg },
  // QR はスキャン精度のため白背景固定
  qrCard: { padding: space.lg, backgroundColor: colors.bg, borderRadius: radius.md },
})
