/** デザイントークン（T-04-6）。全画面でこの値のみを使い、生の色コードを直接書かない。 */
export const colors = {
  // ブランド（ゴルフのフェアウェイグリーン基調）
  primary: '#0B5D2E',
  primaryLight: '#147A3D',
  accent: '#C8A44B',

  // スコア表記（3-2 の色分け慣例に合わせる）
  under: '#D1343C', // アンダーパー（赤）
  even: '#333333',
  over: '#2563C9', // オーバーパー（青）

  bg: '#FFFFFF',
  bgSubtle: '#F5F6F7',
  bgElevated: '#FFFFFF',
  border: '#E3E5E8',
  borderStrong: '#C9CDD2',

  text: '#16181A',
  textSub: '#5C6268',
  textMuted: '#8A9099',
  textInverse: '#FFFFFF',

  danger: '#D1343C',
  warning: '#E8912A',
  success: '#1E8E3E',
  info: '#2563C9',

  live: '#D1343C',
  overlay: 'rgba(0,0,0,0.55)',
} as const

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const

export const font = {
  size: { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, display: 32 },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    bold: '700' as const,
  },
} as const

/** 選手色分けパレット（補-1-37-1: 固定8色、5人目以降は循環） */
export const playerColors = [
  '#D1343C',
  '#2563C9',
  '#1E8E3E',
  '#E8912A',
  '#8B45C9',
  '#0FA3A3',
  '#C8306B',
  '#5C6268',
] as const

export const playerColorAt = (i: number) => playerColors[i % playerColors.length]
