/**
 * Play-by-play の表示テキスト（3-3 / 補-3-3-1, 補-3-3-2）。
 * CMS 入力の `resultText` を優先し、未入力時はショット属性からテンプレート生成する。
 * 例: `1H 2打目 7I 152y → グリーン 残り3.5m`（残り距離は精緻なデータが無いため
 * 「着地ライ + 飛距離」までを機械的に組み立てる。CMS 側で resultText を入れれば
 * より自然な文言（残り○m 等）に上書きできる）。
 */
import type { Shot } from '../types/payload'

type Club = NonNullable<Shot['club']>
type Lie = NonNullable<Shot['startLie']>

export const CLUB_LABELS: Record<Club, string> = {
  driver: 'Dr',
  '3w': '3W',
  '5w': '5W',
  utility: 'UT',
  '3i': '3I',
  '4i': '4I',
  '5i': '5I',
  '6i': '6I',
  '7i': '7I',
  '8i': '8I',
  '9i': '9I',
  pw: 'PW',
  aw: 'AW',
  sw: 'SW',
  lw: 'LW',
  putter: 'PT',
}

export const LIE_LABELS: Record<Lie, string> = {
  tee: 'ティー',
  fairway: 'フェアウェイ',
  rough: 'ラフ',
  bunker: 'バンカー',
  green: 'グリーン',
  hazard: 'ハザード',
  ob: 'OB',
}

/** 補-3-3-2: CMS 未入力時のテンプレート生成 */
export const generateShotResultText = (shot: Shot): string => {
  const club = shot.club ? CLUB_LABELS[shot.club] : undefined
  const parts: string[] = [`${shot.hole}H`, `${shot.shotNo}打目`]
  if (club) parts.push(club)
  if (shot.remainingYards) parts.push(`残り${Math.round(shot.remainingYards)}Y`)
  if (shot.distanceYards) parts.push(`${Math.round(shot.distanceYards)}Y`)
  const lie = shot.endLie ? LIE_LABELS[shot.endLie] : undefined
  if (lie) parts.push(`→ ${lie}`)
  return parts.join(' ')
}

/** 補-3-3-2: CMS 入力（resultText）優先、未入力時は自動生成 */
export const shotResultText = (shot: Shot): string =>
  shot.resultText && shot.resultText.trim().length > 0 ? shot.resultText : generateShotResultText(shot)
