/**
 * TOTP まわりの純粋関数（T-05-6 / 補-6-2-2）。
 *
 * 実際の TOTP シークレット発行・コード検証は CMS 側カスタムエンドポイント
 * （`POST /api/auth/2fa/enroll` / `POST /api/auth/2fa/verify`）で行う想定（サーバ側で
 * シークレットを保持し検証するほうが安全なため）。この module はその周辺で
 * クライアント側にも必要になる「本物の」標準ロジックだけを持つ:
 *   - Base32 エンコード/デコード（RFC 4648）
 *   - otpauth:// URL の組み立て（enroll レスポンスに otpauthUrl が無い場合のフォールバック用）
 *   - リカバリコードの生成（補-6-2-2: 10 個発行）
 *
 * TOTP の HMAC-SHA1 計算そのものはサーバ側の責務とし、ここでは実装しない
 * （シークレットを端末に置いたまま検証まで担うのは安全性の観点で採用しない設計判断）。
 */
import * as Crypto from 'expo-crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** RFC 4648 Base32（パディングなし）へエンコードする */
export const base32Encode = (bytes: Uint8Array): string => {
  let bits = 0
  let value = 0
  let output = ''
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

/** 認証アプリ（Google Authenticator 等）用のシークレットを生成する（160bit = 20byte） */
export const generateTotpSecret = async (byteLength = 20): Promise<string> => {
  const bytes = await Crypto.getRandomBytesAsync(byteLength)
  return base32Encode(bytes)
}

/**
 * otpauth:// URL を組み立てる（QR コード表示用）。
 * サーバの enroll レスポンスに `otpauthUrl` が含まれていればそちらを優先し、
 * 含まれていない場合のみこの関数でクライアント側から組み立てる。
 */
export const buildOtpAuthUrl = ({
  secret,
  accountName,
  issuer = 'J-Tour Fan App',
}: {
  secret: string
  accountName: string
  issuer?: string
}): string => {
  const label = encodeURIComponent(`${issuer}:${accountName}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

/** 6桁コードの入力形式チェック（補-6-2-2） */
export const isValidTotpCodeFormat = (code: string): boolean => /^\d{6}$/.test(code.trim())

const RECOVERY_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' // 紛らわしい文字(0/O/1/I)を除外

/** リカバリコードを 1 個生成する（例: XXXX-XXXX） */
const generateOneRecoveryCode = (bytes: Uint8Array): string => {
  let out = ''
  for (let i = 0; i < 8; i++) {
    out += RECOVERY_ALPHABET[bytes[i] % RECOVERY_ALPHABET.length]
    if (i === 3) out += '-'
  }
  return out
}

/** リカバリコードを count 個発行する（補-6-2-2: 10 個） */
export const generateRecoveryCodes = async (count = 10): Promise<string[]> => {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const bytes = await Crypto.getRandomBytesAsync(8)
    codes.push(generateOneRecoveryCode(bytes))
  }
  return codes
}

/** リカバリコードの入力形式の正規化（大文字化・空白除去） */
export const normalizeRecoveryCode = (input: string): string =>
  input.trim().toUpperCase().replace(/\s+/g, '')
