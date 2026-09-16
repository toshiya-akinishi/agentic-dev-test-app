/**
 * 会場マップ本体（ネイティブ / T-08-5, T-08-6, T-08-7）。
 * react-native-maps 上に 施設ピン（補-1-22-1, 2）・現在地（補-1-30-2）・選手位置（補-1-31-2）を重畳する。
 * Web には react-native-maps の実装が無い（`MapView.web.ts` は未実装ビュー）ため、
 * このファイルはネイティブ専用とし、Web 版は `VenueMapView.web.tsx`（リスト表示）に分離している。
 */
import { Image } from 'expo-image'
import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import MapView, { Circle, Marker } from 'react-native-maps'

import { Txt } from '../../components/ui'
import { mediaUrl } from '../common'
import type { LatLng } from '../../lib/geo'
import { FACILITY_META, type FacilityType } from '../../lib/venue'
import { colors, radius } from '../../theme'
import type { Player, VenueFacility } from '../../types/payload'

export type PlayerPin = {
  player: Player
  location: LatLng
  holeLabel: string
  todayLabel: string
  stale: boolean
}

export type VenueMapViewProps = {
  center: LatLng
  facilities: VenueFacility[]
  userLocation?: { coords: LatLng; accuracy?: number | null }
  playerPins: PlayerPin[]
  onPressFacility: (facility: VenueFacility) => void
  onPressPlayer: (player: Player) => void
}

export const VenueMapView = ({
  center,
  facilities,
  userLocation,
  playerPins,
  onPressFacility,
  onPressPlayer,
}: VenueMapViewProps) => {
  const initialRegion = useMemo(
    () => ({ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }),
    // 初期表示のみに使用するため、以後の center 変化では追随しない
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <MapView style={StyleSheet.absoluteFill} initialRegion={initialRegion}>
      {facilities.map((f) => (
        <Marker
          key={`facility-${f.id}`}
          coordinate={{ latitude: f.location.lat, longitude: f.location.lng }}
          onPress={() => onPressFacility(f)}
          tracksViewChanges={false}
        >
          <FacilityPinView type={f.type} />
        </Marker>
      ))}

      {userLocation ? (
        <>
          {typeof userLocation.accuracy === 'number' && userLocation.accuracy > 0 ? (
            <Circle
              center={{ latitude: userLocation.coords.lat, longitude: userLocation.coords.lng }}
              radius={userLocation.accuracy}
              fillColor="rgba(37,99,201,0.15)"
              strokeColor="rgba(37,99,201,0.4)"
            />
          ) : null}
          <Marker
            coordinate={{ latitude: userLocation.coords.lat, longitude: userLocation.coords.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.userDot} />
          </Marker>
        </>
      ) : null}

      {playerPins.map((p) => (
        <Marker
          key={`player-${p.player.id}`}
          coordinate={{ latitude: p.location.lat, longitude: p.location.lng }}
          onPress={() => onPressPlayer(p.player)}
          tracksViewChanges={false}
        >
          <PlayerPinView pin={p} />
        </Marker>
      ))}
    </MapView>
  )
}

const FacilityPinView = ({ type }: { type: FacilityType }) => {
  const meta = FACILITY_META[type]
  return (
    <View style={[styles.facilityPin, { backgroundColor: meta.color }]}>
      <Txt size="sm">{meta.icon}</Txt>
    </View>
  )
}

/** 補-1-31-2, 4: 顔写真サムネ + 現在ホール + Today。5分以上更新が無い場合はグレーピンにフォールバック */
const PlayerPinView = ({ pin }: { pin: PlayerPin }) => {
  const photo = mediaUrl(pin.player.photo, 'thumb')
  return (
    <View style={styles.playerPinWrap}>
      <View style={[styles.playerPhotoRing, pin.stale && styles.playerPhotoRingStale]}>
        {photo ? (
          <Image source={{ uri: photo }} contentFit="cover" style={styles.playerPhoto} />
        ) : (
          <View style={[styles.playerPhoto, styles.playerPhotoFallback]}>
            <Txt size="xs" weight="bold" color={colors.textInverse}>
              {pin.player.name.slice(0, 1)}
            </Txt>
          </View>
        )}
      </View>
      <View style={[styles.playerChip, pin.stale && styles.playerChipStale]}>
        <Txt size="xs" weight="bold" color={colors.textInverse}>
          {pin.stale ? '取得中' : `${pin.holeLabel} ${pin.todayLabel}`}
        </Txt>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  facilityPin: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  userDot: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.info,
    borderWidth: 3,
    borderColor: colors.bg,
  },
  playerPinWrap: { alignItems: 'center' },
  playerPhotoRing: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: 1,
    backgroundColor: colors.bg,
  },
  playerPhotoRingStale: { borderColor: colors.textMuted },
  playerPhoto: { width: '100%', height: '100%', borderRadius: radius.pill, backgroundColor: colors.primaryLight },
  playerPhotoFallback: { alignItems: 'center', justifyContent: 'center' },
  playerChip: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.text,
  },
  playerChipStale: { backgroundColor: colors.textMuted },
})
