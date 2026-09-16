/** パスワード要件・強度判定（補-6-2-1: 8文字以上、英字と数字を各1文字以上） */

export type PasswordStrength = {
  meetsRequirement: boolean
  score: 0 | 1 | 2 | 3
  label: string
}

const HAS_LETTER = /[A-Za-z]/
const HAS_DIGIT = /[0-9]/
const HAS_SYMBOL = /[^A-Za-z0-9]/

export const passwordMeetsRequirement = (pw: string): boolean =>
  pw.length >= 8 && HAS_LETTER.test(pw) && HAS_DIGIT.test(pw)

/** 強度インジケータ（補-6-2-1）。要件未達は常に弱いスコアにする */
export const passwordStrength = (pw: string): PasswordStrength => {
  const meets = passwordMeetsRequirement(pw)
  if (!meets) {
    return { meetsRequirement: false, score: pw.length === 0 ? 0 : 1, label: pw.length === 0 ? '' : '弱い' }
  }
  let score: 0 | 1 | 2 | 3 = 1
  if (pw.length >= 12) score = 2
  if (pw.length >= 16 && HAS_SYMBOL.test(pw)) score = 3
  const label = score >= 3 ? '非常に強い' : score === 2 ? '強い' : '普通'
  return { meetsRequirement: true, score, label }
}

export const PASSWORD_HINT = '8文字以上、英字と数字をそれぞれ1文字以上含めてください'
