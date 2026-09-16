/** 共通 UI コンポーネント（T-04-6 / docs/04-screen-spec.md 4章） */
import React from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'

import { colors, font, radius, space } from '../theme'

/* ---------------- Text ---------------- */

type TxtProps = {
  children: React.ReactNode
  size?: keyof typeof font.size
  weight?: 'regular' | 'medium' | 'bold'
  color?: string
  style?: StyleProp<TextStyle>
  numberOfLines?: number
  selectable?: boolean
}

export const Txt = ({
  children,
  size = 'md',
  weight = 'regular',
  color = colors.text,
  style,
  numberOfLines,
  selectable,
}: TxtProps) => (
  <Text
    numberOfLines={numberOfLines}
    selectable={selectable}
    style={[{ fontSize: font.size[size], fontWeight: font.weight[weight], color }, style]}
  >
    {children}
  </Text>
)

/* ---------------- Card ---------------- */

export const Card = ({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  onPress?: () => void
}) => {
  const content = <View style={[styles.card, style]}>{children}</View>
  if (!onPress) return content
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {content}
    </Pressable>
  )
}

/* ---------------- Button ---------------- */

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
}) => {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : variant === 'secondary'
          ? colors.bgSubtle
          : 'transparent'
  const fg =
    variant === 'primary' || variant === 'danger' ? colors.textInverse : colors.text

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Txt weight="bold" color={fg}>
          {title}
        </Txt>
      )}
    </Pressable>
  )
}

/* ---------------- Badge ---------------- */

export const Badge = ({
  label,
  color = colors.textSub,
  bg = colors.bgSubtle,
}: {
  label: string
  color?: string
  bg?: string
}) => (
  <View style={[styles.badge, { backgroundColor: bg }]}>
    <Txt size="xs" weight="bold" color={color}>
      {label}
    </Txt>
  </View>
)

/** 大会ステータスのバッジ（補-1-3-2） */
export const StatusBadge = ({ status }: { status?: string | null }) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    live: { label: '開催中', color: '#FFF', bg: colors.live },
    scheduled: { label: '開催予定', color: colors.info, bg: '#E8F0FD' },
    finished: { label: '終了', color: colors.textSub, bg: colors.bgSubtle },
    cancelled: { label: '中止', color: '#FFF', bg: colors.danger },
    postponed: { label: '順延', color: '#FFF', bg: colors.warning },
  }
  const s = status ? map[status] : undefined
  if (!s) return null
  return <Badge label={s.label} color={s.color} bg={s.bg} />
}

/* ---------------- Tabs ---------------- */

export const Tabs = <T extends string>({
  value,
  options,
  onChange,
  scrollable,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  scrollable?: boolean
}) => {
  const inner = (
    <View style={styles.tabRow}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Txt
              size="sm"
              weight={active ? 'bold' : 'regular'}
              color={active ? colors.primary : colors.textSub}
            >
              {o.label}
            </Txt>
          </Pressable>
        )
      })}
    </View>
  )
  if (!scrollable) return inner
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {inner}
    </ScrollView>
  )
}

/* ---------------- 状態表示 ---------------- */

/** 空状態は必ずこれを出す（04-screen-spec.md 4章: 無言の空白を作らない） */
export const EmptyState = ({
  icon = '🏌️',
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) => (
  <View style={styles.center}>
    <Text style={{ fontSize: 40, marginBottom: space.md }}>{icon}</Text>
    <Txt weight="bold" size="lg" style={{ textAlign: 'center' }}>
      {title}
    </Txt>
    {description ? (
      <Txt color={colors.textSub} size="sm" style={{ textAlign: 'center', marginTop: space.sm }}>
        {description}
      </Txt>
    ) : null}
    {actionLabel && onAction ? (
      <Button title={actionLabel} onPress={onAction} style={{ marginTop: space.lg }} />
    ) : null}
  </View>
)

/** エラー表示。オフライン起因は文言を分ける（04-screen-spec.md 4章） */
export const ErrorView = ({
  error,
  onRetry,
}: {
  error: unknown
  onRetry?: () => void
}) => {
  const isOffline =
    typeof error === 'object' && error !== null && (error as { isNetwork?: boolean }).isNetwork
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as Error).message)
      : '予期しないエラーが発生しました'

  return (
    <View style={styles.center}>
      <Text style={{ fontSize: 40, marginBottom: space.md }}>{isOffline ? '📡' : '⚠️'}</Text>
      <Txt weight="bold" size="lg">
        {isOffline ? 'オフラインです' : '読み込めませんでした'}
      </Txt>
      <Txt color={colors.textSub} size="sm" style={{ textAlign: 'center', marginTop: space.sm }}>
        {isOffline ? '電波状況の良い場所でお試しください。' : message}
      </Txt>
      {onRetry ? (
        <Button
          title="再試行"
          variant="ghost"
          onPress={onRetry}
          style={{ marginTop: space.lg }}
        />
      ) : null}
    </View>
  )
}

/** 読み込み中はスケルトン。全画面スピナーは初回起動時のみ */
export const Skeleton = ({
  height = 16,
  width = '100%',
  style,
}: {
  height?: number
  width?: number | `${number}%`
  style?: StyleProp<ViewStyle>
}) => (
  <View
    style={[
      { height, width, backgroundColor: colors.bgSubtle, borderRadius: radius.sm },
      style,
    ]}
  />
)

export const SkeletonList = ({ rows = 6 }: { rows?: number }) => (
  <View style={{ padding: space.lg, gap: space.md }}>
    {Array.from({ length: rows }).map((_, i) => (
      <View key={i} style={{ gap: space.sm }}>
        <Skeleton height={14} width="60%" />
        <Skeleton height={12} width="90%" />
      </View>
    ))}
  </View>
)

export const Loading = () => (
  <View style={styles.center}>
    <ActivityIndicator color={colors.primary} size="large" />
  </View>
)

/** セクション見出し（「もっと見る」導線つき） */
export const SectionHeader = ({
  title,
  actionLabel,
  onAction,
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
}) => (
  <View style={styles.sectionHeader}>
    <Txt size="lg" weight="bold">
      {title}
    </Txt>
    {actionLabel && onAction ? (
      <Pressable onPress={onAction} hitSlop={8}>
        <Txt size="sm" color={colors.primary} weight="medium">
          {actionLabel}
        </Txt>
      </Pressable>
    ) : null}
  </View>
)

export const Divider = () => <View style={styles.divider} />

/* ---------------- フォーム ---------------- */

/** ラベル・エラー表示つきのテキスト入力（EP-05 各フォームで共通利用） */
export const TextField = ({
  label,
  error,
  hint,
  style,
  containerStyle,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label?: string
  error?: string
  hint?: string
  containerStyle?: StyleProp<ViewStyle>
}) => (
  <View style={[{ gap: space.xs }, containerStyle]}>
    {label ? (
      <Txt size="sm" weight="medium" color={colors.textSub}>
        {label}
      </Txt>
    ) : null}
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[
        styles.input,
        error && { borderColor: colors.danger },
        style,
      ]}
      {...props}
    />
    {hint && !error ? (
      <Txt size="xs" color={colors.textMuted}>
        {hint}
      </Txt>
    ) : null}
    {error ? (
      <Txt size="xs" color={colors.danger}>
        {error}
      </Txt>
    ) : null}
  </View>
)

/** チェックボックス（補-6-15-2: 規約同意など） */
export const Checkbox = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: React.ReactNode
}) => (
  <Pressable
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
    onPress={() => onChange(!checked)}
    style={styles.checkboxRow}
  >
    <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
      {checked ? <Txt color={colors.textInverse} size="sm" weight="bold">✓</Txt> : null}
    </View>
    <View style={{ flex: 1 }}>{label}</View>
  </Pressable>
)

/** 下から出るシート（T-05-3 ログイン誘導シート等） */
export const Sheet = ({
  visible,
  onClose,
  children,
}: {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.sheetRoot}>
      <Pressable
        accessibilityLabel="閉じる"
        style={StyleSheet.absoluteFill}
        onPress={onClose}
      />
      <View style={styles.sheetCard}>{children}</View>
    </View>
  </Modal>
)

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  button: {
    minHeight: 46,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  tabRow: { flexDirection: 'row', gap: space.xs },
  tab: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xxl,
    minHeight: 220,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.md,
  },
  divider: { height: 1, backgroundColor: colors.border },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontSize: font.size.md,
    color: colors.text,
    backgroundColor: colors.bgElevated,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxBoxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  sheetRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheetCard: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.xl,
    paddingBottom: space.xxl,
  },
})
