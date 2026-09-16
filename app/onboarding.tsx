/**
 * オンボーディング（T-05-10 / 6-12 / 補-6-12-1, 補-6-12-2）。
 * 初回起動時に自動表示（`app/_layout.tsx` の Bootstrap）。マイページの「使い方ガイド」からも再表示できる。
 * 最終スライドに「お気に入り選手を選ぶ」と「あとで」を置く（補-6-12-1）。
 */
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useAtomValue } from 'jotai'
import React, { useRef, useState } from 'react'
import { Dimensions, FlatList, Pressable, StyleSheet, View, type ViewToken } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button, ErrorView, SkeletonList, Txt } from '../src/components/ui'
import { mediaUrl } from '../src/features/common'
import { Image } from 'expo-image'
import { useOnboardingSlides, useUpdateProfileMutation } from '../src/queries/auth'
import { authUserAtom, saveGuestOnboardingDone } from '../src/store/auth'
import { colors, radius, space } from '../src/theme'
import type { OnboardingSlide } from '../src/types/payload'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export default function OnboardingScreen() {
  const params = useLocalSearchParams<{ replay?: string }>()
  const isReplay = params.replay === '1'
  const insets = useSafeAreaInsets()
  const { data, isLoading, error, refetch } = useOnboardingSlides()
  const user = useAtomValue(authUserAtom)
  const updateProfile = useUpdateProfileMutation()
  const [index, setIndex] = useState(0)
  const listRef = useRef<FlatList<OnboardingSlide>>(null)

  const slides = data?.docs ?? []

  const markDone = () => {
    if (user) updateProfile.mutate({ onboardingCompleted: true })
    else void saveGuestOnboardingDone()
  }

  const finish = (destination?: '/players') => {
    if (!isReplay) markDone()
    if (destination) router.replace(destination)
    else router.back()
  }

  const onViewableChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index !== null && viewableItems[0]?.index !== undefined) {
      setIndex(viewableItems[0].index)
    }
  }).current

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="閉じる"
        style={[styles.closeBtn, { top: insets.top + space.md }]}
        onPress={() => finish()}
      >
        <Txt weight="bold" color={colors.textInverse}>
          ✕
        </Txt>
      </Pressable>

      {isLoading ? (
        <View style={{ marginTop: insets.top + 80 }}>
          <SkeletonList rows={4} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ErrorView error={error} onRetry={() => void refetch()} />
        </View>
      ) : slides.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Txt size="lg" weight="bold" color={colors.textInverse} style={{ textAlign: 'center' }}>
            J-Tour Fan App へようこそ
          </Txt>
          <Txt color={colors.textInverse} size="sm" style={{ textAlign: 'center', marginTop: space.sm }}>
            チュートリアルのコンテンツは準備中です。
          </Txt>
          <Button title="はじめる" onPress={() => finish()} style={{ marginTop: space.xl }} />
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={slides}
            keyExtractor={(s) => String(s.id)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            renderItem={({ item }) => <Slide slide={item} />}
          />

          <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
            <View style={styles.dots}>
              {slides.map((s, i) => (
                <View key={s.id} style={[styles.dot, i === index && styles.dotActive]} />
              ))}
            </View>

            {index === slides.length - 1 ? (
              <View style={{ gap: space.sm }}>
                <Button title="お気に入り選手を選ぶ" onPress={() => finish('/players')} />
                <Button title="あとで" variant="ghost" onPress={() => finish()} />
              </View>
            ) : (
              <Button
                title="次へ"
                onPress={() => listRef.current?.scrollToIndex({ index: index + 1 })}
              />
            )}
          </View>
        </>
      )}
    </View>
  )
}

const Slide = ({ slide }: { slide: OnboardingSlide }) => {
  const uri = mediaUrl(slide.image, 'hero')
  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.slideImage} contentFit="contain" />
      ) : (
        <View style={styles.slideImagePlaceholder}>
          <Txt size="display">🏌️</Txt>
        </View>
      )}
      <Txt size="xxl" weight="bold" color={colors.textInverse} style={{ textAlign: 'center' }}>
        {slide.title}
      </Txt>
      {slide.body ? (
        <Txt color={colors.textInverse} style={{ textAlign: 'center', marginTop: space.md, opacity: 0.85 }}>
          {slide.body}
        </Txt>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  closeBtn: {
    position: 'absolute',
    right: space.lg,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  slideImage: { width: '100%', height: 220, marginBottom: space.xl },
  slideImagePlaceholder: {
    width: 160,
    height: 160,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xl,
  },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, gap: space.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: colors.textInverse, width: 20 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
})
