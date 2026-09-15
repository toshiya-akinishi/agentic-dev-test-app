// CMS の payload-types.ts を app 用に取り込む（T-04-8）。
// 末尾の `declare module 'payload'` はアプリ側に payload パッケージが無く型解決できないため除去する。
import { readFileSync, writeFileSync } from 'node:fs'

const src = '../agentic-dev-test-cms/src/payload-types.ts'
const dest = 'src/types/payload.ts'

let text = readFileSync(src, 'utf8')
const idx = text.indexOf("declare module 'payload'")
if (idx !== -1) text = text.slice(0, idx)

writeFileSync(
  dest,
  `/* 自動生成: pnpm/npm run sync:types で CMS から取り込む。直接編集しないこと。 */\n${text.trimEnd()}\n`,
)
console.log(`synced ${dest}`)
