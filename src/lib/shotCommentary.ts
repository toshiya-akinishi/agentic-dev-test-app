/**
 * AI 解説テキスト（1-40 / 補-1-40-1, 補-1-40-2 / ADR-003）。
 *
 * 実 LLM 呼び出しは行わない。本来は CMS 側のフックで `shots` 保存時にテンプレート生成し
 * `aiCommentary` に格納する想定（運営が上書き編集可）だが、アプリ側でも同じ「CMS優先」パターンで
 * フォールバック生成する（`src/lib/shotText.ts` の resultText と同じ方針・別テンプレート）。
 * 補-1-40-2: 40〜80 文字程度・1 文を目安にする。
 */
import { CLUB_LABELS, LIE_LABELS } from './shotText'
import type { Shot } from '../types/payload'

const SHOT_TYPE_PHRASE: Record<Shot['shotType'], string> = {
  tee: 'ティーショット',
  approach: 'アプローチ',
  bunker: 'バンカーショット',
  recovery: 'リカバリーショット',
  putt: 'パット',
  penalty: 'ペナルティ',
}

const resultPhrase = (shot: Shot): string => {
  const lie = shot.endLie ? LIE_LABELS[shot.endLie] : undefined
  if (shot.endLie === 'ob') return 'OB'
  if (shot.endLie === 'hazard') return 'ハザードへ'
  if (lie) return `${lie}へ`
  return '狙った場所へ'
}

/** 補-1-40-1 / 補-1-40-2: CMS 未入力時のテンプレート生成（40〜80 文字目安・1 文） */
export const generateShotCommentary = (shot: Shot): string => {
  const club = shot.club ? CLUB_LABELS[shot.club] : undefined
  const typePhrase = SHOT_TYPE_PHRASE[shot.shotType]

  const leadParts: string[] = []
  if (shot.remainingYards) leadParts.push(`残り${Math.round(shot.remainingYards)}ヤードを`)
  if (club) leadParts.push(`${club}で`)
  const lead = leadParts.length ? leadParts.join('') : `${typePhrase}を`

  const distancePart = shot.distanceYards ? `${Math.round(shot.distanceYards)}ヤード運び、` : ''
  const tail = shot.endLie === 'green' ? 'グリーンをとらえた好ショット。' : `${resultPhrase(shot)}運んだ。`

  return `${lead}${distancePart}${tail}`
}

/** 補-1-40-1: CMS 入力（aiCommentary）優先。上書きされていなければアプリ側でテンプレート生成する */
export const shotCommentaryText = (shot: Shot): string =>
  shot.aiCommentary && shot.aiCommentary.trim().length > 0 ? shot.aiCommentary : generateShotCommentary(shot)

/** 補-1-40-1: 自動生成のままか（CMS 上書き済みかどうかの表示に使う） */
export const isShotCommentaryGenerated = (shot: Shot): boolean =>
  !shot.aiCommentary || shot.aiCommentaryGenerated !== false
