/**
 * Lexical リッチテキストのレンダラ（T-09 / 補-1-1-2, 補-1-10-1）。
 *
 * Payload の `richText` フィールド（Lexical の SerializedEditorState）を
 * React Native のビューへ描画する汎用コンポーネント。
 * 観戦ガイド記事（補-1-1-2）とニュース詳細（補-1-10-1）の両方から使う。
 *
 * 対応ノード: root / paragraph / heading / list・listitem / link・autolink /
 *            quote / upload（画像）/ text / linebreak / horizontalrule / relationship
 * 未知のノードは「落ちない」ことを最優先に扱う:
 *   - children を持つものは子だけを描画（段落の取りこぼしを防ぐ）
 *   - children を持たないものは無視する
 *
 * 補-1-2-3: 本文中の用語の自動リンク化は行わない。リンクは CMS で手動設定された
 * link / relationship ノードのみを描画する。
 */
import React from 'react'
import { Image } from 'expo-image'
import { Linking, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { API_URL } from '../api/client'
import { colors, font, radius, space } from '../theme'

/* ---------------- 型 ---------------- */

type LexicalNode = {
  type?: string
  children?: LexicalNode[]
  [key: string]: unknown
}

/** Payload の richText フィールド値（`{ root: { children: [...] } }`） */
export type RichTextValue = { root?: { children?: unknown } } | null | undefined

/** 手動設定されたリンクの飛び先（補-1-2-3: 自動リンク化はしない） */
export type RichTextLinkTarget = {
  /** 外部 URL（linkType=custom） */
  url?: string
  /** 内部参照（linkType=internal / relationship ノード） */
  relationTo?: string
  /** 参照先 ID */
  id?: string
}

export type RichTextProps = {
  /** Payload の richText フィールド値 */
  value: unknown
  /** リンクタップ時の処理。未指定の場合、外部 URL は OS に委譲する */
  onPressLink?: (target: RichTextLinkTarget) => void
  /** 画像タップ時の処理（全画面ビューア等） */
  onPressImage?: (image: RichTextImage) => void
  style?: StyleProp<ViewStyle>
}

export type RichTextImage = { url: string; alt?: string; caption?: string }

/* ---------------- ユーティリティ ---------------- */

const asNode = (v: unknown): LexicalNode | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as LexicalNode) : null

const childrenOf = (node: LexicalNode): LexicalNode[] => {
  const c = node.children
  if (!Array.isArray(c)) return []
  return c.map(asNode).filter((n): n is LexicalNode => n !== null)
}

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)

/** Payload のメディア URL は相対パスで返るため API のオリジンを補う */
export const resolveMediaUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined
  if (/^(https?:|data:|file:)/.test(url)) return url
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

/** upload ノード / media リレーションから表示用の画像情報を取り出す */
const toImage = (value: unknown): RichTextImage | null => {
  const doc = asNode(value)
  if (!doc) return null
  const url = resolveMediaUrl(str(doc.url))
  if (!url) return null
  return { url, alt: str(doc.alt), caption: str(doc.caption) }
}

const aspectOf = (value: unknown): number => {
  const doc = asNode(value)
  const w = typeof doc?.width === 'number' ? doc.width : 0
  const h = typeof doc?.height === 'number' ? doc.height : 0
  if (w > 0 && h > 0) return w / h
  return 16 / 9
}

/** Lexical の text ノードのフォーマットはビットフラグ */
const FORMAT = {
  bold: 1,
  italic: 1 << 1,
  strikethrough: 1 << 2,
  underline: 1 << 3,
  code: 1 << 4,
} as const

const linkTargetOf = (node: LexicalNode): RichTextLinkTarget => {
  const fields = asNode(node.fields) ?? {}
  const url = str(fields.url)
  const doc = asNode(fields.doc)
  const relationTo = str(doc?.relationTo) ?? str(node.relationTo)
  const rawValue = doc ? doc.value : node.value
  const id =
    typeof rawValue === 'number' || typeof rawValue === 'string'
      ? String(rawValue)
      : str(asNode(rawValue)?.id) ??
        (typeof asNode(rawValue)?.id === 'number' ? String(asNode(rawValue)?.id) : undefined)
  return { url, relationTo, id }
}

/** relationship ノードの表示ラベル（用語名・記事タイトル等） */
const relationLabelOf = (node: LexicalNode): string | undefined => {
  const doc = asNode(node.value)
  return str(doc?.term) ?? str(doc?.title) ?? str(doc?.name)
}

const HEADING_SIZE: Record<string, keyof typeof font.size> = {
  h1: 'xxl',
  h2: 'xl',
  h3: 'lg',
  h4: 'md',
  h5: 'md',
  h6: 'md',
}

/* ---------------- 本体 ---------------- */

export const RichText = ({ value, onPressLink, onPressImage, style }: RichTextProps) => {
  const root = asNode(asNode(value)?.root)
  const blocks = root ? childrenOf(root) : []

  const handleLink = (target: RichTextLinkTarget) => {
    if (onPressLink) {
      onPressLink(target)
      return
    }
    if (target.url) void Linking.openURL(target.url).catch(() => undefined)
  }

  if (!blocks.length) return null

  return (
    <View style={style}>
      {blocks.map((node, i) => (
        <Block
          key={i}
          node={node}
          onPressLink={handleLink}
          onPressImage={onPressImage}
        />
      ))}
    </View>
  )
}

/* ---------------- インライン ---------------- */

type InlineCtx = {
  onPressLink: (target: RichTextLinkTarget) => void
}

const Inline = ({
  node,
  ctx,
  color,
}: {
  node: LexicalNode
  ctx: InlineCtx
  color?: string
}): React.ReactElement | null => {
  switch (node.type) {
    case 'text': {
      const text = str(node.text) ?? ''
      const fmt = typeof node.format === 'number' ? node.format : 0
      const isCode = (fmt & FORMAT.code) !== 0
      return (
        <Text
          style={[
            color ? { color } : null,
            (fmt & FORMAT.bold) !== 0 && { fontWeight: font.weight.bold },
            (fmt & FORMAT.italic) !== 0 && { fontStyle: 'italic' as const },
            ((fmt & FORMAT.underline) !== 0 || (fmt & FORMAT.strikethrough) !== 0) && {
              textDecorationLine:
                (fmt & FORMAT.underline) !== 0 && (fmt & FORMAT.strikethrough) !== 0
                  ? ('underline line-through' as const)
                  : (fmt & FORMAT.underline) !== 0
                    ? ('underline' as const)
                    : ('line-through' as const),
            },
            isCode && styles.code,
          ]}
        >
          {text}
        </Text>
      )
    }

    case 'linebreak':
      return <Text>{'\n'}</Text>

    case 'tab':
      return <Text>{'	'}</Text>

    case 'link':
    case 'autolink': {
      const target = linkTargetOf(node)
      return (
        <Text
          accessibilityRole="link"
          style={styles.link}
          onPress={() => ctx.onPressLink(target)}
        >
          <InlineChildren node={node} ctx={ctx} color={colors.primary} />
        </Text>
      )
    }

    // 補-1-2-3: CMS で手動設定された参照のみリンクになる
    case 'relationship': {
      const label = relationLabelOf(node)
      if (!label) return null
      return (
        <Text
          accessibilityRole="link"
          style={styles.link}
          onPress={() => ctx.onPressLink(linkTargetOf(node))}
        >
          {label}
        </Text>
      )
    }

    default: {
      // 未知のインラインノードは子だけ描画して落とさない
      const kids = childrenOf(node)
      if (!kids.length) return null
      return <InlineChildren node={node} ctx={ctx} color={color} />
    }
  }
}

const InlineChildren = ({
  node,
  ctx,
  color,
}: {
  node: LexicalNode
  ctx: InlineCtx
  color?: string
}) => (
  <>
    {childrenOf(node).map((child, i) => (
      <Inline key={i} node={child} ctx={ctx} color={color} />
    ))}
  </>
)

/* ---------------- ブロック ---------------- */

type BlockProps = {
  node: LexicalNode
  onPressLink: (target: RichTextLinkTarget) => void
  onPressImage?: (image: RichTextImage) => void
  /** リスト入れ子の深さ */
  depth?: number
}

const Block = ({ node, onPressLink, onPressImage, depth = 0 }: BlockProps): React.ReactElement | null => {
  const ctx: InlineCtx = { onPressLink }

  switch (node.type) {
    case 'paragraph': {
      const kids = childrenOf(node)
      if (!kids.length) return <View style={{ height: space.md }} />
      return (
        <Text style={styles.paragraph}>
          <InlineChildren node={node} ctx={ctx} />
        </Text>
      )
    }

    case 'heading': {
      const tag = str(node.tag) ?? 'h2'
      return (
        <Text
          accessibilityRole="header"
          style={[
            styles.heading,
            { fontSize: font.size[HEADING_SIZE[tag] ?? 'lg'] },
            tag === 'h1' && { marginTop: space.lg },
          ]}
        >
          <InlineChildren node={node} ctx={ctx} />
        </Text>
      )
    }

    case 'quote':
      return (
        <View style={styles.quote}>
          <Text style={styles.quoteText}>
            <InlineChildren node={node} ctx={ctx} />
          </Text>
        </View>
      )

    case 'list': {
      const ordered = str(node.listType) === 'number'
      const start = typeof node.start === 'number' ? node.start : 1
      const items = childrenOf(node)
      return (
        <View style={[styles.list, depth > 0 && { marginTop: 0, marginBottom: 0 }]}>
          {items.map((item, i) => (
            <ListItem
              key={i}
              node={item}
              index={start + i}
              ordered={ordered}
              depth={depth}
              onPressLink={onPressLink}
              onPressImage={onPressImage}
            />
          ))}
        </View>
      )
    }

    case 'listitem':
      return (
        <ListItem
          node={node}
          index={typeof node.value === 'number' ? node.value : 1}
          ordered={false}
          depth={depth}
          onPressLink={onPressLink}
          onPressImage={onPressImage}
        />
      )

    case 'horizontalrule':
      return <View style={styles.hr} />

    case 'upload': {
      const image = toImage(node.value)
      if (!image) return null
      return (
        <Figure
          image={image}
          aspect={aspectOf(node.value)}
          onPress={onPressImage ? () => onPressImage(image) : undefined}
        />
      )
    }

    default: {
      // 未知のブロックノード（block / embed など）は子だけ描画して落とさない
      const kids = childrenOf(node)
      if (!kids.length) return null
      return (
        <>
          {kids.map((child, i) => (
            <Block
              key={i}
              node={child}
              depth={depth}
              onPressLink={onPressLink}
              onPressImage={onPressImage}
            />
          ))}
        </>
      )
    }
  }
}

const ListItem = ({
  node,
  index,
  ordered,
  depth,
  onPressLink,
  onPressImage,
}: {
  node: LexicalNode
  index: number
  ordered: boolean
  depth: number
  onPressLink: (target: RichTextLinkTarget) => void
  onPressImage?: (image: RichTextImage) => void
}) => {
  const kids = childrenOf(node)
  const nested = kids.filter((c) => c.type === 'list')
  const inline = kids.filter((c) => c.type !== 'list')
  const checked = typeof node.checked === 'boolean' ? node.checked : undefined

  const marker = checked !== undefined ? (checked ? '☑' : '☐') : ordered ? `${index}.` : '・'

  return (
    <View style={styles.listItem}>
      <View style={styles.listRow}>
        <Text style={styles.listMarker}>{marker}</Text>
        <Text style={[styles.paragraph, styles.listText]}>
          {inline.map((child, i) => (
            <Inline key={i} node={child} ctx={{ onPressLink }} />
          ))}
        </Text>
      </View>
      {nested.map((child, i) => (
        <View key={i} style={{ paddingLeft: space.lg }}>
          <Block
            node={child}
            depth={depth + 1}
            onPressLink={onPressLink}
            onPressImage={onPressImage}
          />
        </View>
      ))}
    </View>
  )
}

const Figure = ({
  image,
  aspect,
  onPress,
}: {
  image: RichTextImage
  aspect: number
  onPress?: () => void
}) => (
  <View style={styles.figure}>
    <Image
      source={{ uri: image.url }}
      accessibilityLabel={image.alt}
      contentFit="cover"
      style={[styles.image, { aspectRatio: aspect }]}
      onTouchEnd={onPress}
    />
    {image.caption ? <Text style={styles.caption}>{image.caption}</Text> : null}
  </View>
)

/* ---------------- テキスト抽出 ---------------- */

/** リッチテキストから素のテキストを取り出す（一覧のプレビュー表示・検索用） */
export const richTextToPlainText = (value: unknown, maxLength = 200): string => {
  const root = asNode(asNode(value)?.root)
  if (!root) return ''

  const out: string[] = []
  let total = 0

  const walk = (node: LexicalNode) => {
    if (total >= maxLength) return
    if (node.type === 'text') {
      const t = str(node.text) ?? ''
      out.push(t)
      total += t.length
      return
    }
    if (node.type === 'linebreak') {
      out.push(' ')
      total += 1
      return
    }
    const kids = childrenOf(node)
    for (const child of kids) walk(child)
    // ブロック区切りは空白にしておく
    if (kids.length && node.type !== 'root') {
      out.push(' ')
      total += 1
    }
  }

  walk(root)
  const text = out.join('').replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

const styles = StyleSheet.create({
  paragraph: {
    fontSize: font.size.md,
    lineHeight: font.size.md * 1.8,
    color: colors.text,
    marginBottom: space.md,
  },
  heading: {
    fontWeight: font.weight.bold,
    color: colors.text,
    marginTop: space.lg,
    marginBottom: space.sm,
    lineHeight: font.size.xl * 1.5,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontWeight: font.weight.medium,
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: colors.bgSubtle,
    color: colors.text,
  },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryLight,
    backgroundColor: colors.bgSubtle,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.sm,
    marginBottom: space.md,
  },
  quoteText: {
    fontSize: font.size.md,
    lineHeight: font.size.md * 1.7,
    color: colors.textSub,
  },
  list: { marginBottom: space.md, gap: space.xs },
  listItem: { gap: space.xs },
  listRow: { flexDirection: 'row', gap: space.sm },
  listMarker: {
    fontSize: font.size.md,
    lineHeight: font.size.md * 1.8,
    color: colors.textSub,
    minWidth: 20,
  },
  listText: { flex: 1, marginBottom: 0 },
  hr: { height: 1, backgroundColor: colors.border, marginVertical: space.lg },
  figure: { marginBottom: space.lg, gap: space.xs },
  image: {
    width: '100%',
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
  },
  caption: { fontSize: font.size.xs, color: colors.textMuted },
})

export default RichText
