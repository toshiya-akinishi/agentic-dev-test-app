# agentic-dev-test-app

**J-Tour Fan App** のフロントエンド（モバイルアプリ）。

## 技術スタック

- TypeScript (strict)
- React Native / Expo（expo-router によるファイルベースルーティング）
- TanStack Query v5（サーバ状態・ポーリング・オフライン永続化）
- Jotai（クライアント状態）

## 計画・仕様

実装は [agentic-dev-test-hub](https://github.com/toshiya-akinishi/agentic-dev-test-hub) の計画ドキュメントに従う。ローカルに hub リポジトリを clone してあれば `../agentic-dev-test-hub/docs/` を直接参照してもよい。

| ドキュメント | 内容 |
|---|---|
| [05-wbs.md](https://github.com/toshiya-akinishi/agentic-dev-test-hub/blob/feature/test1/docs/05-wbs.md) | **タスク分解（作業指示書）** |
| [01-architecture.md](https://github.com/toshiya-akinishi/agentic-dev-test-hub/blob/feature/test1/docs/01-architecture.md) | ディレクトリ構成・状態管理方針 |
| [03-api-spec.md](https://github.com/toshiya-akinishi/agentic-dev-test-hub/blob/feature/test1/docs/03-api-spec.md) | API 仕様 |
| [04-screen-spec.md](https://github.com/toshiya-akinishi/agentic-dev-test-hub/blob/feature/test1/docs/04-screen-spec.md) | 画面仕様（約 25 画面） |
| [09-decisions.md](https://github.com/toshiya-akinishi/agentic-dev-test-hub/blob/feature/test1/docs/09-decisions.md) | ADR（設計判断の記録） |
| [requirements/](https://github.com/toshiya-akinishi/agentic-dev-test-hub/blob/feature/test1/docs/requirements/REQ-INDEX.md) | 機能別 要求仕様書（97 要求 + 補完要件 208 件） |

進捗管理: [hub の Issues](https://github.com/toshiya-akinishi/agentic-dev-test-hub/issues)（このリポジトリの担当 Epic は EP-04〜EP-17）

## 作業ブランチ

`feature/test1`

## セットアップ

### 前提条件

- **Node.js** — `package.json` に `engines` の指定はない。姉妹リポジトリの `agentic-dev-test-cms` は `>= 20.9.0` を要求しているため、揃えて Node 20.9 以上を推奨する。
- **npm** — このリポジトリは `package-lock.json` のみをコミットしており、`pnpm-lock.yaml` はない。依存関係のインストール・スクリプト実行は npm を使う（`npx <script>` または `npm run <script>`）。pnpm を使っている場合でも `package.json` の `scripts` はそのまま動くが、ロックファイルの整合性は npm 基準になる。
- **Expo CLI** — グローバルインストールは不要。`npx expo ...` または `npm run` 経由の `scripts`（後述）で `node_modules/.bin` の Expo CLI が実行される。
- **`agentic-dev-test-cms` バックエンドの起動済みインスタンス** — 実データで動作確認するには、seed 済みの CMS（Payload CMS + SQLite、既定で `http://localhost:3000`）が別途起動している必要がある。CMS 側のセットアップは `agentic-dev-test-cms/README.md` を参照。CMS を起動せずに `expo start` すること自体は可能だが、画面はほぼ全て API 呼び出しに失敗する。

### 1. 環境変数（`.env` / `EXPO_PUBLIC_API_URL`）

API のベース URL は環境変数 `EXPO_PUBLIC_API_URL` 1 つで設定する（`EXPO_PUBLIC_` プレフィックスにより Expo がクライアントバンドルに埋め込む）。リポジトリには以下がある。

- `.env.example` — テンプレート。内容は `EXPO_PUBLIC_API_URL=http://localhost:3000`
- `.env` — 実際に読み込まれる設定（`.gitignore` 済み、リポジトリには含まれない）

セットアップ時は `.env.example` を `.env` にコピーし、必要に応じて値を変更する。

```bash
cp .env.example .env
```

値の目安:

| 実行環境 | 設定値の例 |
|---|---|
| Web（`expo start --web`、同一マシンで CMS も起動） | `http://localhost:3000`（既定値のまま） |
| iOS/Android シミュレータ・エミュレータ（同一マシン） | `http://localhost:3000` で通ることが多い（Android エミュレータは環境により `http://10.0.2.2:3000` が必要な場合あり） |
| 実機（Expo Go 等、開発マシンと同一 LAN） | 開発マシンの LAN IP を使う（例: `http://192.168.1.20:3000`）。`localhost` は実機からは自分自身を指すため使えない |

`.env` を変更したら `expo start` を再起動して反映させる。

### 2. インストール

```bash
npm install
```

### 3. 型の同期（`sync:types`）

`src/types/payload.ts` は CMS の生成型 `payload-types.ts` を取り込んだ**自動生成ファイル**で、直接編集しない。

```bash
npm run sync:types
```

`scripts/sync-types.mjs` は次の相対パスをそのまま読みに行く。

```js
const src = '../agentic-dev-test-cms/src/payload-types.ts'
```

つまり **`agentic-dev-test-app` と `agentic-dev-test-cms` を同じ親ディレクトリの下に兄弟（sibling）としてそれぞれ clone しておく必要がある**（例: `~/work/agentic-dev-test-app` と `~/work/agentic-dev-test-cms`）。パスが異なる場所に置いている場合はこのスクリプトは失敗する。取り込み時に、アプリ側に `payload` パッケージが無く型解決できない末尾の `declare module 'payload'` ブロックは自動的に除去される。

### 4. 起動

```bash
npm start          # expo start（Metro を起動し、QR コード / キー操作でプラットフォームを選択）
npm run web        # expo start --web
npm run ios        # expo start --ios
npm run android    # expo start --android
```

いずれも `.env` の `EXPO_PUBLIC_API_URL` が指す CMS が起動・seed 済みであることを前提とする。

## 動作確認（スモークテスト）

コードに変更を加えた後は、最低限これらが通ることを確認する。

```bash
npx tsc --noEmit                                      # 型エラー 0 件であること
npx expo export --platform web --output-dir /tmp/expo-check   # Web バンドルが成功すること
```

**注意**: `react-native-maps` は Web 向けのエクスポートを持たない（`MapView.web.ts` が空実装）。このリポジトリでは `ADR-024`（[09-decisions.md](https://github.com/toshiya-akinishi/agentic-dev-test-hub/blob/feature/test1/docs/09-decisions.md)）の決定に従い、地図を使う画面はプラットフォーム分岐ファイル（例: `src/features/venue/VenueMapView.tsx` と `VenueMapView.web.tsx`）で Web ビルドから `react-native-maps` を完全に除外している。Metro のプラットフォーム拡張子解決により、Web 版は地図の代わりにリスト表示にフォールバックする（実際の地図描画ではない）。この構造のおかげで `expo export --platform web` は壊れずに通る。

## テストアカウント

このリポジトリ自体はテストデータを持たない。ロールベースアクセス制御（管理者・スタッフ・スポンサー・ファン・ゲスト等 5 ロール）を確認するための seed 済みテストアカウント一覧は `agentic-dev-test-cms/README.md` の「テストアカウント」節を参照。CMS 側で `pnpm seed` / `pnpm seed:reset` を実行して作成する。

## アプリ構成（概要）

- `app/` — expo-router によるファイルベースルート定義のみ。ロジックは置かない。
- `src/queries/` — TanStack Query のフック。1 ドメイン 1 ファイル（`rankings.ts`, `tickets.ts`, `players.ts` など）。汎用フックは `src/queries/hooks.ts`、`queryKey` は `src/queries/keys.ts` の `qk` にまとめる。
- `src/features/<name>/` — 機能固有のコンポーネント（`venue`, `tickets`, `leaderboard`, `live` など、画面領域ごとにディレクトリを分ける）。
- `src/components/ui.tsx` — 画面をまたぐ共有デザインシステムコンポーネント（`EmptyState` / `Skeleton` / `ErrorView` 等）。
- `src/store/` — Jotai atom（認証状態・deviceId・ネットワーク品質・画面フィルタなど）。
- `src/lib/` — 純粋関数・ユーティリティ（`geo.ts` / `analytics.ts` / `network.tsx` / `totp.ts` / `format.ts` など）。

詳細な規約（データ取得の作法・状態管理の置き場所・UI トークンなど）は同リポジトリの [`AGENTS.md`](./AGENTS.md) を参照。

## 既知の環境上の制約

- **プッシュ通知は実配信されない**（[ADR-013](https://github.com/toshiya-akinishi/agentic-dev-test-hub/blob/feature/test1/docs/09-decisions.md)）。`app.json` に `expo-notifications` プラグインの設定や EAS の `projectId` がまだ構成されていないため、プッシュトークンの取得はモックへフォールバックする。これは検証環境に FCM/APNs の証明書・実機が無いという hub 側の前提と一致した意図的なスコープ外扱いであり、バグではない。
- **`react-native-maps` の Web フォールバックは実際の地図ではない**。上記スモークテストの節の通り、Web ビルドではリスト表示に置き換わる（[ADR-024](https://github.com/toshiya-akinishi/agentic-dev-test-hub/blob/feature/test1/docs/09-decisions.md)）。

## 関連ドキュメント（hub リポジトリ）

アーキテクチャ・画面仕様・要求仕様・ADR の全体像は `agentic-dev-test-hub` にある。ローカルに clone していれば `../agentic-dev-test-hub/docs/` を、していなければ本 README 冒頭の GitHub リンク（`feature/test1` ブランチ）を参照。
