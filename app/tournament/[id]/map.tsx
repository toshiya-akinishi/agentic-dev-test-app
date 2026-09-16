/**
 * 会場マップ `/tournament/[id]/map`（T-08-5〜T-08-8, T-08-12 / 要求 1-22, 1-25, 1-30, 1-31, 1-26）。
 *
 * 「会場マップ」タブ: 施設ピン8種フィルタ（補-1-22-1,2）+ 現在地（補-1-30-1,2）+
 * 選手位置（お気に入り選手 or 表示中の組・補-1-31-1〜4）を同一マップに描画する（受け入れ基準）。
 * 「グルメ」タブ: リスト⇔地図切替（補-1-25-1,2）。
 * ネイティブは react-native-maps、Web は一覧フォールバック（`VenueMapView.web.tsx` 参照）。
 */
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useAtom, useStore } from 'jotai'
import React, { useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'

import { Badge, EmptyState, ErrorView, Loading, Tabs, Txt } from '../../../src/components/ui'
import { relDoc, relIds } from '../../../src/features/common'
import { TournamentTabs } from '../../../src/features/tournaments'
import {
  FacilityDetailSheet,
  FacilityFilterChips,
  StoreCarousel,
  VenueMapView,
  type PlayerPin,
} from '../../../src/features/venue'
import { formatRelative, formatToPar } from '../../../src/lib/format'
import { useCurrentLocation } from '../../../src/lib/location'
import {
  FACILITY_TYPES,
  GOURMET_FACILITY_TYPES,
  isOutsideVenue,
  isStalePosition,
  type FacilityType,
} from '../../../src/lib/venue'
import { useFavoritePlayers } from '../../../src/queries/home'
import { buildLeaderboardEntries, useTournamentScores } from '../../../src/queries/leaderboard'
import { pickDefaultRound, usePairings, useTournament, useTournamentRounds } from '../../../src/queries/tournaments'
import { usePlayerPositions, useVenueFacilities } from '../../../src/queries/venue'
import { leaderboardFilterAtom, leaderboardSearchAtom, facilityFilterAtom } from '../../../src/store/ui'
import { colors, radius, space } from '../../../src/theme'
import type { Player, VenueFacility, Venue } from '../../../src/types/payload'

type TopTab = 'map' | 'gourmet'
type TargetMode = 'favorites' | 'group'

export default function VenueMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: tournament, isLoading, error, refetch } = useTournament(id)
  const venue = tournament ? relDoc<Venue>(tournament.venue) : undefined

  const { data: facilitiesData } = useVenueFacilities(venue?.id, tournament?.id)
  const allFacilities = facilitiesData?.docs ?? []

  const [topTab, setTopTab] = useState<TopTab>('map')
  const [gourmetView, setGourmetView] = useState<'list' | 'map'>('list')
  const [filterTypes, setFilterTypes] = useAtom(facilityFilterAtom)
  const toggleFilter = (t: FacilityType) =>
    setFilterTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  /** チップ未選択＝すべて表示（補-1-22-2） */
  const mapFacilities = useMemo(
    () => (filterTypes.length ? allFacilities.filter((f) => filterTypes.includes(f.type)) : allFacilities),
    [allFacilities, filterTypes],
  )
  const gourmetFacilities = useMemo(
    () => allFacilities.filter((f) => GOURMET_FACILITY_TYPES.includes(f.type as FacilityType)),
    [allFacilities],
  )

  const [selectedFacility, setSelectedFacility] = useState<VenueFacility | undefined>(undefined)

  /* ---------------- 現在地（T-08-6 / 補-1-30-1, 2） ---------------- */
  const location = useCurrentLocation(true)
  const userLocation =
    location.status === 'granted' && location.coords
      ? { coords: location.coords, accuracy: location.accuracy }
      : undefined
  const outsideVenue = Boolean(venue && userLocation && isOutsideVenue(venue.location, userLocation.coords))

  /* ---------------- 選手位置の対象（補-1-31-1: お気に入り選手 or 表示中の組） ---------------- */
  const [targetMode, setTargetMode] = useState<TargetMode>('favorites')
  const { playerIds: favoritePlayerIds } = useFavoritePlayers()
  const { data: roundsData } = useTournamentRounds(id)
  const rounds = roundsData?.docs ?? []
  const defaultRound = pickDefaultRound(rounds)
  const { data: pairingsData } = usePairings(defaultRound?.id)
  const pairings = pairingsData?.docs ?? []
  const [groupNo, setGroupNo] = useState<number | undefined>(undefined)
  useEffect(() => {
    if (groupNo === undefined && pairings.length) setGroupNo(pairings[0].groupNo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairings.length])

  const groupPlayerIds = useMemo(() => {
    const g = pairings.find((p) => p.groupNo === groupNo) ?? pairings[0]
    return relIds(g?.players)
  }, [pairings, groupNo])

  const targetPlayerIds = targetMode === 'favorites' ? favoritePlayerIds : groupPlayerIds
  const positionsLive = topTab === 'map'
  const { latestByPlayerId } = usePlayerPositions(tournament?.id, targetPlayerIds, positionsLive)

  /** Today スコア表示用（補-1-31-2）。マップ表示中のみ取得する */
  const roundIds = useMemo(() => rounds.map((r) => r.id), [rounds])
  const { data: scoresData } = useTournamentScores(id, roundIds, positionsLive)
  const entryByPlayerId = useMemo(() => {
    const entries = buildLeaderboardEntries(scoresData?.docs ?? [], rounds)
    return new Map(entries.map((e) => [e.player.id, e]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoresData, rounds.length])

  const playerPins = useMemo<PlayerPin[]>(() => {
    const pins: PlayerPin[] = []
    for (const pid of targetPlayerIds) {
      const pos = latestByPlayerId.get(pid)
      if (!pos) continue
      const player = relDoc<Player>(pos.player)
      if (!player) continue
      const entry = entryByPlayerId.get(pid)
      pins.push({
        player,
        location: pos.location,
        holeLabel: typeof pos.hole === 'number' ? `${pos.hole}H` : '-',
        todayLabel: entry ? formatToPar(entry.latest.today) : '-',
        stale: isStalePosition(pos.recordedAt),
      })
    }
    return pins
  }, [targetPlayerIds, latestByPlayerId, entryByPlayerId])

  const lastUpdatedAt = useMemo(() => {
    let latest: string | undefined
    for (const pos of latestByPlayerId.values()) {
      if (!latest || pos.recordedAt > latest) latest = pos.recordedAt
    }
    return latest
  }, [latestByPlayerId])

  const jotaiStore = useStore()
  const onPressPlayer = (player: Player) => {
    if (!tournament) return
    const key = String(tournament.id)
    jotaiStore.set(leaderboardFilterAtom(key), 'all')
    jotaiStore.set(leaderboardSearchAtom(key), player.name)
    router.push(`/tournament/${tournament.id}/leaderboard`)
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: '会場マップ' }} />
      <TournamentTabs tournamentId={id} active="map" />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorView error={error} onRetry={() => void refetch()} />
      ) : !tournament || !venue ? (
        <EmptyState icon="🗺️" title="会場情報がまだ登録されていません" />
      ) : (
        <>
          <Tabs
            value={topTab}
            onChange={setTopTab}
            options={[
              { value: 'map', label: '会場マップ' },
              { value: 'gourmet', label: 'グルメ' },
            ]}
          />

          {topTab === 'map' ? (
            <>
              <FacilityFilterChips types={FACILITY_TYPES} selected={filterTypes} onToggle={toggleFilter} />

              <View style={styles.targetRow}>
                <Chip label="お気に入り選手" active={targetMode === 'favorites'} onPress={() => setTargetMode('favorites')} />
                <Chip label="表示中の組" active={targetMode === 'group'} onPress={() => setTargetMode('group')} disabled={!pairings.length} />
                {targetMode === 'group' && pairings.length > 0 ? (
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={pairings}
                    keyExtractor={(p) => String(p.id)}
                    contentContainerStyle={{ gap: space.xs, marginLeft: space.sm }}
                    renderItem={({ item }) => (
                      <Chip
                        label={`第${item.groupNo}組`}
                        active={item.groupNo === groupNo}
                        onPress={() => setGroupNo(item.groupNo)}
                      />
                    )}
                  />
                ) : null}
              </View>

              {targetMode === 'favorites' && favoritePlayerIds.length === 0 ? (
                <Txt size="xs" color={colors.textMuted} style={styles.hint}>
                  お気に入り選手がいません。選手詳細から登録すると位置がここに表示されます。
                </Txt>
              ) : null}

              {location.status === 'denied' ? (
                <Txt size="xs" color={colors.textMuted} style={styles.hint}>
                  現在地を表示できません（位置情報の利用が許可されていません）
                </Txt>
              ) : outsideVenue ? (
                <View style={styles.outsideBanner}>
                  <Txt size="sm" color={colors.textInverse} weight="bold">
                    会場外にいます
                  </Txt>
                </View>
              ) : null}

              <View style={{ flex: 1 }}>
                <VenueMapView
                  center={venue.location}
                  facilities={mapFacilities}
                  userLocation={userLocation}
                  playerPins={playerPins}
                  onPressFacility={setSelectedFacility}
                  onPressPlayer={onPressPlayer}
                />
              </View>

              {lastUpdatedAt ? (
                <Txt size="xs" color={colors.textMuted} style={styles.hint}>
                  選手位置 最終更新 {formatRelative(lastUpdatedAt)}
                </Txt>
              ) : null}
            </>
          ) : (
            <GourmetTab
              facilities={gourmetFacilities}
              view={gourmetView}
              onChangeView={setGourmetView}
              center={venue.location}
              userLocation={userLocation}
              onSelectFacility={setSelectedFacility}
              officialStoreUrl={tournament.officialStoreUrl}
            />
          )}
        </>
      )}

      <FacilityDetailSheet facility={selectedFacility} onClose={() => setSelectedFacility(undefined)} />
    </View>
  )
}

/** T-08-8 / 補-1-25-1, 2: グルメ・お土産のリスト⇔地図表示 */
const GourmetTab = ({
  facilities,
  view,
  onChangeView,
  center,
  userLocation,
  onSelectFacility,
  officialStoreUrl,
}: {
  facilities: VenueFacility[]
  view: 'list' | 'map'
  onChangeView: (v: 'list' | 'map') => void
  center: { lat: number; lng: number }
  userLocation?: { coords: { lat: number; lng: number }; accuracy?: number | null }
  onSelectFacility: (f: VenueFacility) => void
  officialStoreUrl?: string | null
}) => {
  const goodsFacilities = useMemo(() => facilities.filter((f) => f.type === 'goods'), [facilities])

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.viewToggleRow}>
        <Chip label="リスト" active={view === 'list'} onPress={() => onChangeView('list')} />
        <Chip label="地図" active={view === 'map'} onPress={() => onChangeView('map')} />
      </View>

      {view === 'list' ? (
        <FlatList
          data={facilities}
          keyExtractor={(f) => String(f.id)}
          ListHeaderComponent={
            <StoreCarousel goodsFacilities={goodsFacilities} officialStoreUrl={officialStoreUrl} />
          }
          renderItem={({ item }) => <GourmetListRow facility={item} onPress={() => onSelectFacility(item)} />}
          ListEmptyComponent={<EmptyState icon="🍴" title="グルメ・お土産情報がまだ登録されていません" />}
          contentContainerStyle={{ paddingBottom: space.xxl }}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <VenueMapView
            center={center}
            facilities={facilities}
            userLocation={userLocation}
            playerPins={[]}
            onPressFacility={onSelectFacility}
            onPressPlayer={() => undefined}
          />
        </View>
      )}
    </View>
  )
}

const GourmetListRow = ({ facility, onPress }: { facility: VenueFacility; onPress: () => void }) => {
  const prices = (facility.menuItems ?? []).map((m) => m.price).filter((p): p is number => typeof p === 'number')
  const priceLabel = prices.length ? `${Math.min(...prices).toLocaleString('ja-JP')}円〜` : undefined
  return (
    <Pressable style={styles.gourmetRow} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Txt weight="medium">{facility.type === 'food' ? '🍴' : '🛍️'} {facility.name}</Txt>
        {facility.openHours ? (
          <Txt size="xs" color={colors.textMuted}>
            {facility.openHours}
          </Txt>
        ) : null}
      </View>
      {priceLabel ? <Badge label={priceLabel} /> : null}
    </Pressable>
  )
}

const Chip = ({
  label,
  active,
  onPress,
  disabled,
}: {
  label: string
  active: boolean
  onPress: () => void
  disabled?: boolean
}) => (
  <Pressable
    disabled={disabled}
    onPress={onPress}
    style={[styles.chip, active && styles.chipActive, disabled && { opacity: 0.4 }]}
  >
    <Txt size="sm" weight={active ? 'bold' : 'regular'} color={active ? colors.textInverse : colors.text}>
      {label}
    </Txt>
  </Pressable>
)

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm },
  viewToggleRow: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  hint: { paddingHorizontal: space.lg, paddingBottom: space.xs },
  outsideBanner: {
    marginHorizontal: space.lg,
    marginBottom: space.xs,
    paddingVertical: 6,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.warning,
    alignSelf: 'flex-start',
  },
  gourmetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
})
