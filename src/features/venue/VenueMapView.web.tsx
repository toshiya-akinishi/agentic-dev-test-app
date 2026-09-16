/**
 * 会場マップの Web 版フォールバック（`expo export --platform web` 対応）。
 *
 * `react-native-maps` の `MapView` は Web 版が `react-native-web` の
 * `UnimplementedView`（空ビュー）にしかならず（`node_modules/react-native-maps/src/MapView.web.ts`）、
 * 実際の地図描画は行われない。この画面自体（Marker/Circle を含む `react-native-maps` の各種コンポーネント）は
 * ネイティブ専用の `VenueMapView.tsx` に閉じ込め、Web 向けはこのファイル（同名の `.web.tsx`）で
 * 完全に差し替える。react-native-maps を一切 import しないため、Web ビルドのモジュールグラフに
 * ネイティブ専用コードが含まれることも無い。
 *
 * 代替 UI: 施設・選手位置を「一覧」として表示する。ピンタップ＝行タップに対応させ、
 * フィルタ・現在地・選手位置の各機能自体は Web でも一覧の形で利用できるようにする
 * （地図描画のみ利用不可）。
 */
import { Image } from 'expo-image'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { mediaUrl } from '../common'
import { FACILITY_META } from '../../lib/venue'
import { colors, radius, space } from '../../theme'
import type { VenueMapViewProps } from './VenueMapView'

export const VenueMapView = ({
  facilities,
  userLocation,
  playerPins,
  onPressFacility,
  onPressPlayer,
}: VenueMapViewProps) => {
  return (
    <View style={styles.root}>
      <View style={styles.notice}>
        <Txt size="xs" color={colors.textSub}>
          🖥️ Web 版では地図の代わりに一覧を表示しています。地図表示はモバイルアプリでご利用いただけます。
        </Txt>
      </View>

      {userLocation ? (
        <View style={styles.userRow}>
          <Txt size="sm">📍 現在地を取得しました（緯度 {userLocation.coords.lat.toFixed(4)} / 経度 {userLocation.coords.lng.toFixed(4)}）</Txt>
        </View>
      ) : null}

      {playerPins.length > 0 ? (
        <View style={{ gap: space.xs }}>
          <Txt size="sm" weight="bold" color={colors.textSub}>
            選手位置
          </Txt>
          {playerPins.map((p) => {
            const photo = mediaUrl(p.player.photo, 'thumb')
            return (
              <Pressable key={p.player.id} style={styles.row} onPress={() => onPressPlayer(p.player)}>
                {photo ? (
                  <Image source={{ uri: photo }} contentFit="cover" style={styles.photo} />
                ) : (
                  <View style={[styles.photo, styles.photoFallback]}>
                    <Txt size="xs" weight="bold" color={colors.textInverse}>
                      {p.player.name.slice(0, 1)}
                    </Txt>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Txt weight="medium">{p.player.name}</Txt>
                  <Txt size="xs" color={p.stale ? colors.textMuted : colors.textSub}>
                    {p.stale ? '位置情報取得中' : `${p.holeLabel} ・ ${p.todayLabel}`}
                  </Txt>
                </View>
              </Pressable>
            )
          })}
        </View>
      ) : null}

      <View style={{ gap: space.xs, marginTop: space.md }}>
        <Txt size="sm" weight="bold" color={colors.textSub}>
          施設一覧
        </Txt>
        {facilities.map((f) => {
          const meta = FACILITY_META[f.type]
          return (
            <Pressable key={f.id} style={styles.row} onPress={() => onPressFacility(f)}>
              <View style={[styles.iconWrap, { backgroundColor: meta.color }]}>
                <Txt size="sm">{meta.icon}</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt weight="medium">{f.name}</Txt>
                <Txt size="xs" color={colors.textMuted}>
                  {meta.label}
                </Txt>
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg },
  notice: {
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
  },
  userRow: { marginBottom: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  photo: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primaryLight },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
