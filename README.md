# NiwaLog（ニワログ）

造園・庭園管理業務における現場記録管理システム

## 概要

NiwaLogは、現場ごとの詳細情報を蓄積・管理し、収益性分析、従業員稼働管理、案件の時系列変化を可視化するWebアプリケーションです。

## 技術スタック

- **フロントエンド**: Vite + React 18 + TypeScript
- **UI**: Radix UI + Tailwind CSS
- **フォーム**: React Hook Form + Zod
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth

## 開発環境のセットアップ

### 必要な環境

- Node.js 18以上
- Docker Desktop

### インストール手順

1. リポジトリのクローン:
```bash
git clone https://github.com/yourusername/niwalog-app.git
cd niwalog-app
```

2. 依存関係のインストール:
```bash
npm install
```

3. Supabaseローカル環境の起動:
```bash
npx supabase start
```

4. 環境変数の設定:
`.env.local.example`をコピーして`.env.local`を作成し、Supabaseの接続情報を設定してください。

5. 開発サーバーの起動:
```bash
npm run dev
```

## 利用可能なスクリプト

- `npm run dev` - 開発サーバー起動
- `npm run build` - 本番ビルド
- `npm run preview` - ビルドしたアプリのプレビュー
- `npm run lint` - ESLint実行
- `npx supabase start` - Supabaseローカル起動
- `npx supabase stop` - Supabaseローカル停止
- `npx supabase db reset` - データベースリセット

## プロジェクト構造

```
niwalog-app/
├── src/
│   ├── lib/          # API層とユーティリティ
│   ├── pages/        # ページコンポーネント
│   ├── components/   # 再利用可能なコンポーネント
│   ├── schemas/      # Zodバリデーションスキーマ
│   └── main.tsx      # エントリーポイント
├── supabase/
│   ├── migrations/   # データベースマイグレーション
│   └── config.toml   # Supabase設定
└── package.json
```

## 主要機能（Phase 1）

- [x] プロジェクトセットアップ
- [x] Supabaseローカル環境構築
- [ ] 現場マスタ管理（CRUD）
- [ ] 案件記録機能
- [ ] 日別作業記録＋従事者稼働管理
- [ ] ダッシュボード・分析機能
- [ ] 履歴表示機能

## ライセンス

MIT

## 作成者

Claude Code
