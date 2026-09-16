/**
 * プロフィール編集画面（T-05-7 / 6-3, 6-5 / 補-6-5-1, 補-6-5-2）。
 * 必須は表示名とメールアドレスのみ。他はすべて任意（補-6-5-2）。
 * `GET /api/users/me` で全項目を取得し、`PATCH /api/users/:id` で更新する（いずれも標準 REST）。
 */
import { Stack } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'

import type { ApiError } from '../../src/api/client'
import { Button, Card, ErrorView, SkeletonList, Tabs, TextField, Txt } from '../../src/components/ui'
import { SnsLinkButtons } from '../../src/features/auth'
import { useMyProfile, useUpdateProfileMutation } from '../../src/queries/auth'
import { colors, space } from '../../src/theme'
import type { User } from '../../src/types/payload'

const GENDER_OPTIONS: Array<{ value: NonNullable<User['gender']> | 'unset'; label: string }> = [
  { value: 'unset', label: '未回答' },
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
  { value: 'undisclosed', label: '回答しない' },
]

const CLUB_CATEGORIES: Array<{ value: NonNullable<User['golfClubSetting']>[number]['category']; label: string }> = [
  { value: 'driver', label: 'ドライバー' },
  { value: 'iron', label: 'アイアン' },
  { value: 'wedge', label: 'ウェッジ' },
  { value: 'putter', label: 'パター' },
  { value: 'ball', label: 'ボール' },
  { value: 'wear', label: 'ウェア' },
  { value: 'shoes', label: 'シューズ' },
]

export default function EditProfileScreen() {
  const { data, isLoading, error, refetch } = useMyProfile()
  const update = useUpdateProfileMutation()

  const user = data?.user

  const [displayName, setDisplayName] = useState('')
  const [fullName, setFullName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [gender, setGender] = useState<(typeof GENDER_OPTIONS)[number]['value']>('unset')
  const [postalCode, setPostalCode] = useState('')
  const [prefecture, setPrefecture] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [golfExperienceYears, setGolfExperienceYears] = useState('')
  const [favoritePlayerText, setFavoritePlayerText] = useState('')
  const [clubBrands, setClubBrands] = useState<Record<string, string>>({})
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // サーバから取得した値でフォームを初期化する（初回のみ）
  useEffect(() => {
    if (!user) return
    setDisplayName(user.displayName ?? '')
    setFullName(user.fullName ?? '')
    setBirthYear(user.birthYear ? String(user.birthYear) : '')
    setGender((user.gender as (typeof GENDER_OPTIONS)[number]['value']) ?? 'unset')
    setPostalCode(user.postalCode ?? '')
    setPrefecture(user.prefecture ?? '')
    setAddress(user.address ?? '')
    setPhone(user.phone ?? '')
    setGolfExperienceYears(user.golfExperienceYears ? String(user.golfExperienceYears) : '')
    setFavoritePlayerText(user.favoritePlayerText ?? '')
    const brands: Record<string, string> = {}
    for (const c of user.golfClubSetting ?? []) brands[c.category] = c.brand
    setClubBrands(brands)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (isLoading && !user) return <SkeletonList rows={8} />
  if (error && !user) return <ErrorView error={error} onRetry={() => void refetch()} />

  const submit = () => {
    const patch: Record<string, unknown> = {
      displayName: displayName.trim(),
      fullName: fullName.trim() || null,
      birthYear: birthYear.trim() ? Number(birthYear.trim()) : null,
      gender: gender === 'unset' ? null : gender,
      postalCode: postalCode.trim() || null,
      prefecture: prefecture.trim() || null,
      address: address.trim() || null,
      phone: phone.trim() || null,
      golfExperienceYears: golfExperienceYears.trim() ? Number(golfExperienceYears.trim()) : null,
      favoritePlayerText: favoritePlayerText.trim() || null,
      golfClubSetting: CLUB_CATEGORIES.filter((c) => clubBrands[c.value]?.trim()).map((c) => ({
        category: c.value,
        brand: clubBrands[c.value].trim(),
      })),
    }
    update.mutate(patch, { onSuccess: () => setSavedAt(Date.now()) })
  }

  const errorMessage = update.isError
    ? ((update.error as ApiError)?.message ?? '保存できませんでした')
    : undefined

  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
      <Stack.Screen options={{ title: 'プロフィール編集' }} />

      <Txt size="xxl" weight="bold">
        プロフィール編集
      </Txt>
      <Txt size="sm" color={colors.textSub}>
        必須項目は表示名のみです。他の項目は未入力でもすべての機能を利用できます（補-6-5-2）。
      </Txt>

      <TextField label="表示名（必須）" value={displayName} onChangeText={setDisplayName} />
      <TextField label="氏名" value={fullName} onChangeText={setFullName} />
      <TextField
        label="メールアドレス"
        value={user?.email ?? ''}
        editable={false}
        hint="メールアドレスの変更はサポートへお問い合わせください"
      />

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <TextField
          label="生年（年のみ）"
          value={birthYear}
          onChangeText={setBirthYear}
          keyboardType="number-pad"
          containerStyle={{ flex: 1 }}
        />
        <TextField
          label="ゴルフ歴（年）"
          value={golfExperienceYears}
          onChangeText={setGolfExperienceYears}
          keyboardType="number-pad"
          containerStyle={{ flex: 1 }}
        />
      </View>

      <View>
        <Txt size="sm" weight="medium" color={colors.textSub} style={{ marginBottom: space.xs }}>
          性別
        </Txt>
        <Tabs value={gender} options={GENDER_OPTIONS} onChange={setGender} scrollable />
      </View>

      <TextField label="郵便番号" value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" />
      <TextField label="都道府県" value={prefecture} onChangeText={setPrefecture} />
      <TextField label="住所" value={address} onChangeText={setAddress} />
      <TextField label="電話番号" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label="好きな選手" value={favoritePlayerText} onChangeText={setFavoritePlayerText} />

      <Card style={{ gap: space.sm }}>
        <Txt weight="bold">使用クラブ（補-4-6-2）</Txt>
        {CLUB_CATEGORIES.map((c) => (
          <TextField
            key={c.value}
            label={c.label}
            value={clubBrands[c.value] ?? ''}
            onChangeText={(v) => setClubBrands((prev) => ({ ...prev, [c.value]: v }))}
            placeholder="ブランド名"
          />
        ))}
      </Card>

      <Card>
        <SnsLinkButtons />
        <View style={{ marginTop: space.md, gap: space.xs }}>
          {(user?.snsAccounts ?? []).map((a) => (
            <Txt key={a.id ?? a.accountId} size="sm" color={colors.textSub}>
              連携済み: {a.provider} ({a.accountId})
            </Txt>
          ))}
        </View>
      </Card>

      {errorMessage ? (
        <Txt size="sm" color={colors.danger}>
          {errorMessage}
        </Txt>
      ) : null}
      {savedAt ? (
        <Txt size="sm" color={colors.success}>
          保存しました
        </Txt>
      ) : null}

      <Button
        title="保存する"
        onPress={submit}
        loading={update.isPending}
        disabled={displayName.trim().length === 0}
      />
    </ScrollView>
  )
}
