/**
 * 用語集のインクリメンタルサーチ（補-1-2-1）。
 *
 * - 用語（`term`）/ かな（`reading`）/ 別名・英字表記（`aliases[].value`）のいずれかに一致
 * - 入力 1 文字から反応する（デバウンスなし・端末側で絞り込むため往復が発生しない）
 * - カタカナ⇄ひらがな、全角⇄半角、大文字⇄小文字、長音・中黒の揺れを吸収する
 */
import type { GlossaryTerm } from '../../types/payload'

/** 文字列正規化: 全角→半角 / カタカナ→ひらがな / 小文字化 / 記号・空白除去 */
export const normalizeForSearch = (input: string | null | undefined): string => {
  if (!input) return ''

  // NFKC は環境によっては未実装のため存在確認してから使う
  let s = input
  try {
    if (typeof s.normalize === 'function') s = s.normalize('NFKC')
  } catch {
    // 正規化できなくても以下の手動変換で実用上十分
  }

  let out = ''
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0

    // 全角英数記号 → 半角
    if (code >= 0xff01 && code <= 0xff5e) {
      out += String.fromCodePoint(code - 0xfee0)
      continue
    }
    // 全角スペース
    if (code === 0x3000) continue
    // 半角カナの長音
    if (code === 0xff70) {
      out += 'ー'
      continue
    }
    // カタカナ → ひらがな（ヴ・ヵ・ヶ含む）
    if (code >= 0x30a1 && code <= 0x30f6) {
      out += String.fromCodePoint(code - 0x60)
      continue
    }
    out += ch
  }

  return out
    .toLowerCase()
    // 空白・中黒・ハイフン等の区切りは検索対象から外す（「サンド セーブ」でも当たるように）
    .replace(/[\s・･,、.。/\\_\-―‐]/g, '')
}

/** 1 つの用語に対する検索対象テキスト（用語 / かな / 別名） */
const searchFieldsOf = (term: GlossaryTerm): string[] => {
  const aliases = (term.aliases ?? [])
    .map((a) => a?.value)
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
  return [term.term, term.reading, ...aliases]
}

/** マッチ強度。小さいほど上位に出す */
const MATCH_NONE = 99

const matchRank = (term: GlossaryTerm, query: string): number => {
  if (!query) return 0

  const fields = searchFieldsOf(term).map(normalizeForSearch)
  let best = MATCH_NONE

  fields.forEach((field, index) => {
    if (!field) return
    if (field === query) best = Math.min(best, index === 0 ? 0 : 1)
    else if (field.startsWith(query)) best = Math.min(best, index === 0 ? 2 : 3)
    else if (field.includes(query)) best = Math.min(best, index === 0 ? 4 : 5)
  })

  return best
}

/** 用語が検索語に一致するか（補-1-2-1） */
export const matchesGlossaryQuery = (term: GlossaryTerm, rawQuery: string): boolean =>
  matchRank(term, normalizeForSearch(rawQuery)) !== MATCH_NONE

/**
 * 検索語で用語を絞り込み、一致の強い順 → かな順に並べる（補-1-2-1）。
 * 空文字のときは全件をかな順で返す。
 */
export const filterGlossaryTerms = (
  terms: GlossaryTerm[],
  rawQuery: string,
  category?: string | null,
): GlossaryTerm[] => {
  const query = normalizeForSearch(rawQuery)
  const byCategory = category ? terms.filter((t) => t.category === category) : terms

  if (!query) return [...byCategory].sort(byReading)

  return byCategory
    .map((term) => ({ term, rank: matchRank(term, query) }))
    .filter((r) => r.rank !== MATCH_NONE)
    .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : byReading(a.term, b.term)))
    .map((r) => r.term)
}

const byReading = (a: GlossaryTerm, b: GlossaryTerm): number =>
  (a.reading ?? '').localeCompare(b.reading ?? '', 'ja')
