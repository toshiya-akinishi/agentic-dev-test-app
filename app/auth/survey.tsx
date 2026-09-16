/**
 * 登録直後アンケート（T-05-7 / 補-6-5-3）。
 * ゴルフ歴・観戦経験・好きな選手の3問。スキップ可能。
 *
 * ゴルフ歴・好きな選手は `users.golfExperienceYears` / `users.favoritePlayerText`
 * （標準フィールド）へ保存する。観戦経験は現行の Payload スキーマに対応フィールドが
 * 無いため端末ローカル（AsyncStorage）にのみ保存する（CMS 側に `spectatingExperience`
 * 相当のフィールド追加を推奨— 最終報告に記載）。
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router, Stack } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, TextInput, View } from 'react-native'

import { Button, Card, Txt } from '../../src/components/ui'
import { useUpdateProfileMutation } from '../../src/queries/auth'
import { colors, space } from '../../src/theme'

const GOLF_EXPERIENCE_OPTIONS = [
  { value: 0, label: 'したことがない' },
  { value: 1, label: '1〜3年' },
  { value: 5, label: '4〜9年' },
  { value: 10, label: '10年以上' },
]

const SPECTATING_OPTIONS = [
  { value: 'none', label: '現地観戦したことがない' },
  { value: 'sometimes', label: '数回ある' },
  { value: 'every_year', label: '毎年観戦している' },
]

export const SPECTATING_EXPERIENCE_KEY = 'jtour.survey.spectatingExperience'

export default function SurveyScreen() {
  const [golfYears, setGolfYears] = useState<number | null>(null)
  const [spectating, setSpectating] = useState<string | null>(null)
  const [favoritePlayer, setFavoritePlayer] = useState('')
  const update = useUpdateProfileMutation()

  const finish = () => router.replace('/')

  const submit = () => {
    const patch: Record<string, unknown> = {}
    if (golfYears !== null) patch.golfExperienceYears = golfYears
    if (favoritePlayer.trim()) patch.favoritePlayerText = favoritePlayer.trim()

    const save = async () => {
      if (spectating) await AsyncStorage.setItem(SPECTATING_EXPERIENCE_KEY, spectating)
      if (Object.keys(patch).length > 0) {
        update.mutate(patch, { onSuccess: finish, onError: finish })
      } else {
        finish()
      }
    }
    void save()
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
      <Stack.Screen options={{ title: 'かんたんアンケート', headerBackVisible: false }} />

      <Txt size="xxl" weight="bold">
        ご登録ありがとうございます
      </Txt>
      <Txt size="sm" color={colors.textSub}>
        よろしければ3つだけ教えてください（あとで「マイページ」から変更できます）。スキップも可能です。
      </Txt>

      <Card>
        <Txt weight="bold" style={{ marginBottom: space.md }}>
          Q1. ゴルフ歴はどのくらいですか？
        </Txt>
        <View style={{ gap: space.sm }}>
          {GOLF_EXPERIENCE_OPTIONS.map((o) => (
            <OptionRow key={o.value} selected={golfYears === o.value} label={o.label} onPress={() => setGolfYears(o.value)} />
          ))}
        </View>
      </Card>

      <Card>
        <Txt weight="bold" style={{ marginBottom: space.md }}>
          Q2. 現地観戦の経験はありますか？
        </Txt>
        <View style={{ gap: space.sm }}>
          {SPECTATING_OPTIONS.map((o) => (
            <OptionRow
              key={o.value}
              selected={spectating === o.value}
              label={o.label}
              onPress={() => setSpectating(o.value)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Txt weight="bold" style={{ marginBottom: space.md }}>
          Q3. 好きな選手はいますか？（自由入力）
        </Txt>
        <FreeTextInput value={favoritePlayer} onChangeText={setFavoritePlayer} />
      </Card>

      <Button title="回答して始める" onPress={submit} loading={update.isPending} />
      <Button title="スキップ" variant="ghost" onPress={finish} />
    </ScrollView>
  )
}

const OptionRow = ({
  selected,
  label,
  onPress,
}: {
  selected: boolean
  label: string
  onPress: () => void
}) => (
  <Card
    onPress={onPress}
    style={{
      paddingVertical: space.md,
      borderColor: selected ? colors.primary : colors.border,
      backgroundColor: selected ? colors.bgSubtle : colors.bgElevated,
    }}
  >
    <Txt weight={selected ? 'bold' : 'regular'} color={selected ? colors.primary : colors.text}>
      {label}
    </Txt>
  </Card>
)

// TextField は label 前提のため、装飾のいらないこの画面専用に軽量な入力を用意する
const FreeTextInput = ({ value, onChangeText }: { value: string; onChangeText: (v: string) => void }) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder="例: 松山英樹"
    placeholderTextColor={colors.textMuted}
    style={{
      minHeight: 46,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: space.md,
      color: colors.text,
    }}
  />
)
