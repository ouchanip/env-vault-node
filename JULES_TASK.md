# env-vault (Node.js版) — 実装タスク

## 概要
Python版 env-vault のNode.js移植。.envファイルを暗号化/復号化するCLIツール。

## 要件

### 機能
1. `vault init` — 暗号化キーを生成 (`.env.key`)
2. `vault encrypt` — `.env` を暗号化して `.env.enc` に出力
3. `vault decrypt` — `.env.enc` を復号化して stdout or ファイルに出力
4. オプション: `--input-file`, `--output-file` で入出力ファイルを指定

### 技術スタック
- **Node.js 18+** (LTS対応)
- **暗号化**: Node.js標準 `crypto` モジュール (AES-256-GCM)
- **CLI**: `commander` パッケージ
- **ゼロ外部依存** を目指す（crypto は標準）

### npx対応
- `npx env-vault init` で即使えるように `bin` フィールドを設定
- package.json の `bin` に `env-vault` を登録

### ファイル構成
```
env-vault-node/
├── bin/
│   └── env-vault.js          # CLI エントリーポイント (#!/usr/bin/env node)
├── src/
│   ├── index.js               # メインロジック
│   ├── crypto.js              # 暗号化/復号化
│   └── utils.js               # ユーティリティ
├── tests/
│   ├── crypto.test.js         # 暗号化テスト
│   ├── cli.test.js            # CLIテスト
│   └── e2e.test.js            # E2Eテスト
├── package.json
├── README.md
├── LICENSE                     # MIT
└── .gitignore
```

### テスト
- **Jest** or **Vitest** でユニットテスト
- 暗号化→復号化の往復テスト
- エッジケース: 空ファイル、大きなファイル、特殊文字
- CLIの引数パーステスト

### README
- インストール方法 (`npm install -g env-vault` / `npx env-vault`)
- 使い方 (init, encrypt, decrypt)
- セキュリティ説明 (AES-256-GCM)
- ライセンス: MIT

### 品質基準
- TypeScript不要（JavaScript ESM）
- ESLint設定 (`eslint.config.mjs`)
- テストカバレッジ80%以上
- `npm run build` は不要（pure JS）
- `npm test` でテスト実行

## 禁止事項
- `npm install` をタスク内で実行しないこと（依存は package.json に定義するだけ）
- 不要なフレームワークの導入禁止
- TypeScriptへの変換禁止（JavaScript ESMで統一）
