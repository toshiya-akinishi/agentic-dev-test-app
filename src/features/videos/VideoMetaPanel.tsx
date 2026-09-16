/**
 * 動画詳細のメタデータ表示（T-12-2 / 要求 2-9 / 補-2-9-1, 2）。
 *
 * 表示項目: 大会名・ラウンド・ホール番号・ショット番号・ショット時刻・ショット種別・
 * 打点位置/停止位置（緯度経度・ミニマップ）・飛距離・使用クラブ。
 *
 * ギャップ（要報告）: cms `videos` コレクションには `club`（使用クラブ）と `distanceYards`
 * （飛距離の実測値）に相当するフィールドが無い（`shots` にはあるが `videos` は独立レコード）。
 * 飛距離は打点/停止点の緯度経度から概算した推定値を `ShotMiniMap` 側で表示し、
 * 使用クラブは表示できるデータが無いため項目自体を出さない。
 */
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Txt } from '../../components/ui'
import { relDoc } from '../common'
import { hasLatLng, haversineMeters, metersToYards } from '../../lib/geo'
import { formatDate, formatTime } from '../../lib/format'
import { shotTypeLabel } from '../../queries/videos'
import { colors, space } from '../../theme'
import type { Player, Round, Tournament, Video } from '../../types/payload'
import { ShotMiniMap } from './ShotMiniMap'

export const VideoMetaPanel = ({ video }: { video: Video }) => {
  const tournament = relDoc<Tournament>(video.tournament)
  const round = relDoc<Round>(video.round)
  const player = relDoc<Player>(video.player)

  const rows: Array<[string, string]> = []
  if (tournament) rows.push(['大会', tournament.name])
  if (round) rows.push(['ラウンド', `${round.number}R`])
  if (player) rows.push(['選手', player.name])
  if (video.hole) rows.push(['ホール', `${video.hole}H`])
  if (video.shotNo) rows.push(['ショット番号', `${video.shotNo}打目`])
  if (video.shotTime) rows.push(['ショット時刻', `${formatDate(video.shotTime)} ${formatTime(video.shotTime)}`])
  if (video.shotType) rows.push(['ショット種別', shotTypeLabel(video.shotType)])
  // ギャップ: cms の videos には distanceYards（実測飛距離）が無いため、緯度経度からの推定値を出す
  if (hasLatLng(video.startLocation) && hasLatLng(video.endLocation)) {
    const yards = Math.round(metersToYards(haversineMeters(video.startLocation, video.endLocation)))
    rows.push(['飛距離（推定）', `約${yards}Y`])
  }

  return (
    <View style={styles.panel}>
      <Txt weight="bold" size="md" style={{ marginBottom: space.sm }}>
        メタデータ
      </Txt>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Txt size="sm" color={colors.textSub} style={styles.label}>
            {label}
          </Txt>
          <Txt size="sm" style={{ flex: 1 }}>
            {value}
          </Txt>
        </View>
      ))}

      <ShotMiniMap video={video} />
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { paddingHorizontal: space.lg, paddingTop: space.md },
  row: { flexDirection: 'row', paddingVertical: 4 },
  label: { width: 96 },
})
