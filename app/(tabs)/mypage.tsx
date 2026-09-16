/**
 * マイページ（EP-05 / 04-screen-spec.md 2章）。
 * 未ログイン時は先頭にログイン・新規登録カードを出す（6-1）。
 * アカウント専用の項目（プロフィール編集・セキュリティ・退会）はゲストだとログイン誘導シートを開く（T-05-3）。
 */
import { router } from 'expo-router'
import { useAtom, useAtomValue } from 'jotai'
import React from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Switch as RNSwitch, View } from 'react-native'

import { Button, Card, Txt } from '../../src/components/ui'
import { useLoginGate } from '../../src/features/auth'
import { useLogout } from '../../src/queries/auth'
import { authUserAtom, isGuestAtom } from '../../src/store/auth'
import { forceLowBandwidthAtom } from '../../src/store/network'
import { colors, radius, space } from '../../src/theme'

export default function MyPageScreen() {
  const user = useAtomValue(authUserAtom)
  const isGuest = useAtomValue(isGuestAtom)
  const requireAuth = useLoginGate()
  const logout = useLogout()
  const [lowBandwidth, setLowBandwidth] = useAtom(forceLowBandwidthAtom)

  const goAuthed = (path: string, reason: string) => {
    if (!requireAuth(reason)) return
    router.push(path)
  }

  const confirmLogout = () => {
    Alert.alert('ログアウトしますか？', undefined, [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: () => void logout() },
    ])
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {isGuest ? (
        <Card style={styles.loginCard}>
          <Txt size="lg" weight="bold">
            ログイン・新規登録
          </Txt>
          <Txt size="sm" color={colors.textSub} style={{ marginTop: space.xs, marginBottom: space.lg }}>
            ログインするとお気に入りや観戦履歴を引き継いで、他の端末からも利用できます。
          </Txt>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Button title="ログイン" onPress={() => router.push('/auth/login')} style={{ flex: 1 }} />
            <Button
              title="新規登録"
              variant="secondary"
              onPress={() => router.push('/auth/register')}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      ) : (
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Txt size="xl">👤</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt size="lg" weight="bold">
              {user?.displayName}
            </Txt>
            <Txt size="sm" color={colors.textSub}>
              {user?.email}
            </Txt>
          </View>
        </Card>
      )}

      <Section title="アカウント">
        <MenuRow
          label="プロフィール編集"
          onPress={() => goAuthed('/mypage/edit', 'プロフィールの編集にはログインが必要です')}
        />
        <MenuRow
          label="セキュリティ（2段階認証）"
          onPress={() => goAuthed('/mypage/security', 'セキュリティ設定にはログインが必要です')}
        />
      </Section>

      <Section title="ヘルプ・情報">
        <MenuRow label="使い方ガイド" onPress={() => router.push('/onboarding?replay=1')} />
        <MenuRow label="よくある質問（FAQ）" onPress={() => router.push('/mypage/faq')} />
        <MenuRow label="お問い合わせ" onPress={() => router.push('/mypage/contact')} />
        <MenuRow label="利用規約" onPress={() => router.push('/mypage/legal/terms')} />
        <MenuRow label="プライバシーポリシー" onPress={() => router.push('/mypage/legal/privacy')} last />
      </Section>

      <Section title="表示設定">
        <View style={styles.row}>
          <Txt style={{ flex: 1 }}>低速モードを常に有効にする</Txt>
          <Switch value={lowBandwidth} onValueChange={setLowBandwidth} />
        </View>
      </Section>

      {!isGuest ? (
        <Section title="">
          <MenuRow label="ログアウト" onPress={confirmLogout} />
          <MenuRow
            label="退会"
            danger
            onPress={() => goAuthed('/mypage/withdraw', '退会にはログインが必要です')}
            last
          />
        </Section>
      ) : null}
    </ScrollView>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ marginTop: space.xl }}>
    {title ? (
      <Txt size="sm" weight="bold" color={colors.textMuted} style={styles.sectionTitle}>
        {title}
      </Txt>
    ) : null}
    <Card style={{ padding: 0 }}>{children}</Card>
  </View>
)

const MenuRow = ({
  label,
  onPress,
  danger,
  last,
}: {
  label: string
  onPress: () => void
  danger?: boolean
  last?: boolean
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.row, !last && styles.rowBorder]}
  >
    <Txt style={{ flex: 1 }} color={danger ? colors.danger : colors.text}>
      {label}
    </Txt>
    <Txt color={colors.textMuted}>›</Txt>
  </Pressable>
)

// react-native の Switch はテーマトークンで色付けして共通化する
const Switch = ({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) => (
  <RNSwitch
    value={value}
    onValueChange={onValueChange}
    trackColor={{ false: colors.border, true: colors.primaryLight }}
    thumbColor={colors.bgElevated}
  />
)

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xxl },
  loginCard: { padding: space.lg },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { marginBottom: space.sm, marginLeft: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 48,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
})
