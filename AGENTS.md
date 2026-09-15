# 実装規約（J-Tour Fan App）

このリポジトリで画面を実装するときに必ず守るルール。仕様の正は
[hub リポジトリの計画ドキュメント](https://github.com/toshiya-akinishi/agentic-dev-test-hub/tree/feature/test1/docs)。

## 1. 参照する仕様

| 何を作るか | 読むもの |
|---|---|
| 画面の構成・遷移 | `hub/docs/04-screen-spec.md` |
| API の叩き方 | `hub/docs/03-api-spec.md` |
| データの形 | `hub/docs/02-data-model.md` / `src/types/payload.ts` |
| 機能の要件 | `hub/docs/requirements/REQ-S*.md` の「補完要件」節 |
| 自分のタスク | `hub/docs/05-wbs.md` |

補完要件 ID（`補-1-5-2` など）はコード上のコメントに残すこと。後から要求との対応が追える。

## 2. ディレクトリ

```
app/                 expo-router のルート定義のみ。ロジックは置かない
src/api/             fetch ラッパと Payload where クエリビルダ
src/queries/         TanStack Query のフック。1 ドメイン 1 ファイル
src/store/           Jotai atom
src/components/      画面をまたぐ共通 UI
src/features/<name>/ 機能固有のコンポーネント
src/lib/             フォーマッタ・座標変換など純粋関数
src/theme/           デザイントークン
```

## 3. データ取得

- **画面から `fetch` / `request` を直接呼ばない。** 必ず `src/queries/` のフック経由。
- 汎用フックは `src/queries/hooks.ts` にある: `useList` / `useDoc` / `useInfiniteList` / `useCustom` / `useLiveQuery` / `useApiMutation`
- `queryKey` は `src/queries/keys.ts` の `qk` に追加してから使う。文字列直書き禁止
- Payload の `where` は `src/api/query.ts` の `and()` / `or()` とオブジェクト記法で組む。URL 文字列を手で作らない
- ライブ更新（リーダーボード等）は `useLiveQuery` を使う。`refetchInterval` を自前で書かない
  （低速時に 15s→60s へ自動で延びる仕組みが入っている: 補-8-2-1）

## 4. 状態管理

| 状態 | 置き場所 |
|---|---|
| サーバ由来のデータ | TanStack Query |
| 認証・deviceId・ネットワーク品質・画面フィルタ | Jotai（`src/store/`） |
| モーダル / シートの開閉 | ローカル `useState` |

ゲスト（未ログイン）対応が必要な機能は `deviceIdAtom` を使う。API クライアントが
`X-Device-Id` ヘッダを自動で付けるので、フック側で明示的に渡す必要はない（補-6-1-1）。

## 5. UI

- 色・余白・フォントは `src/theme` のトークンのみ。生の `#RRGGBB` を書かない
- スコア表記（`-5` / `E` / `+2`）と順位（`T3`）は `src/lib/format.ts` の関数を使う。自前で書かない
- 選手の色分けは `playerColorAt(index)`（補-1-37-1 の固定8色パレット）
- **空状態は必ず `EmptyState`**（アイコン + 一文 + 次の行動導線）。無言の空白を作らない
- 読み込み中は `Skeleton` / `SkeletonList`。全画面スピナーは起動時のみ
- エラーは `ErrorView`（オフライン起因は文言が自動で変わる）
- 日本語 UI。ラベル・メッセージはすべて日本語

## 6. やらないこと

- `npm install` は原則しない（必要な依存はすべて導入済み）。どうしても必要なら理由とともに報告する
- `package.json` / `tsconfig.json` / `app.json` の編集（必要なら報告のみ）
- `src/types/payload.ts` の手編集（`npm run sync:types` で CMS から取り込む生成物）
- git commit / push（まとめて行う）

## 7. 完了条件

- `npx tsc --noEmit` がエラー 0
- `npx expo export --platform web --output-dir /tmp/expo-check` が成功する（バンドルが通る）
- 担当した要求 ID の画面に、CMS のテストデータが実際に表示される
