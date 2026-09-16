/**
 * 観戦ガイド・用語集のデータ取得フック（EP-09 / 要求 1-1, 1-2）。
 * 画面からは必ずこのフック経由で取得する（AGENTS.md 3章）。
 */
import { or } from '../api/query'
import { useList, useDoc, type PaginatedResponse } from './hooks'
import { qk } from './keys'
import type { GlossaryTerm, GuideArticle } from '../types/payload'

/* ---------------- ガイド記事（1-1） ---------------- */

/** 補-1-1-1: ガイド記事の 3 カテゴリ。一覧はこのタブで切り替える */
export const GUIDE_CATEGORIES = [
  { value: 'manner', label: 'マナー' },
  { value: 'rule', label: 'ルール' },
  { value: 'beginner', label: 'はじめて' },
] as const

export type GuideCategory = (typeof GUIDE_CATEGORIES)[number]['value']

export const guideCategoryLabel = (category: string | null | undefined): string =>
  GUIDE_CATEGORIES.find((c) => c.value === category)?.label ?? 'ガイド'

/**
 * カテゴリ別のガイド記事一覧（補-1-1-1）。
 * カテゴリ内は `order` 昇順、同順は新しい更新順。
 */
export const useGuideArticles = (category?: GuideCategory) =>
  useList<GuideArticle>(qk.guideArticles(category), 'guide-articles', {
    where: category ? { category: { equals: category } } : undefined,
    sort: 'order,-updatedAt',
    limit: 100,
    depth: 1,
  })

/**
 * ガイド記事詳細（補-1-1-2: 見出し + 本文 + 画像 0..n + 動画 0..1）。
 * ルートは slug 引きだが、本文中の relationship リンク（補-1-2-3）は id しか
 * 持たないことがあるため、slug 一致 OR id 一致のどちらでも解決できるようにする。
 * depth=2 で `video.thumbnail` / `video.file` まで展開する。
 */
export const useGuideArticle = (slugOrId: string | undefined) => {
  const idIfNumeric = slugOrId && /^\d+$/.test(slugOrId) ? Number(slugOrId) : undefined
  const query = useList<GuideArticle>(
    qk.guideArticle(slugOrId ?? ''),
    'guide-articles',
    {
      where: or(
        { slug: { equals: slugOrId ?? '' } },
        idIfNumeric !== undefined ? { id: { equals: idIfNumeric } } : undefined,
      ),
      limit: 1,
      depth: 2,
    },
    { enabled: Boolean(slugOrId) },
  )
  return { ...query, article: firstDoc(query.data) }
}

/* ---------------- 用語集（1-2） ---------------- */

/** 用語カテゴリ（GlossaryTerms.category と同じ選択肢） */
export const GLOSSARY_CATEGORY_LABELS: Record<string, string> = {
  score: 'スコア',
  rule: 'ルール',
  shot: 'ショット',
  course: 'コース',
  equipment: 'クラブ・道具',
  tournament: '大会・競技',
  other: 'その他',
}

/** 用語集の取得上限。Ph1 の用語数（数百件）は 1 回で取り切れる想定 */
export const GLOSSARY_FETCH_LIMIT = 500

/**
 * 用語集の全件取得（1-2）。
 *
 * 補-1-2-1 の「入力 1 文字からのインクリメンタルサーチ」は、
 * 1 文字ごとにサーバへ問い合わせると体感が悪く、`aliases` の配列内一致も
 * サーバ側 like では取りこぼすため、**全件を 1 度取得して端末側で絞り込む**方式にした。
 * 用語集は `PERSISTED_KEY_ROOTS` に含まれ（補-8-1-1）オフラインでも検索できる。
 * 絞り込みは `src/features/guide/search.ts` の `filterGlossaryTerms`。
 */
export const useGlossaryTerms = () =>
  useList<GlossaryTerm>(qk.glossary(), 'glossary-terms', {
    sort: 'reading',
    limit: GLOSSARY_FETCH_LIMIT,
    depth: 0,
  })

/**
 * 用語詳細（補-1-2-2: 関連用語を最大 5 件表示）。
 * depth=1 で `relatedTerms` を用語オブジェクトまで展開する。
 */
export const useGlossaryTerm = (id: string | undefined) =>
  useDoc<GlossaryTerm>(qk.glossaryTerm(id ?? ''), 'glossary-terms', id, 1)

/* ---------------- 共通 ---------------- */

const firstDoc = <T>(data: PaginatedResponse<T> | undefined): T | undefined => data?.docs?.[0]
