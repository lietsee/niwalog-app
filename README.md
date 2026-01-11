# NiwaLog（ニワログ）

造園・庭園管理業務における現場記録管理システム

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [技術スタック](#技術スタック)
3. [開発環境のセットアップ](#開発環境のセットアップ)
4. [プロジェクト構造](#プロジェクト構造)
5. [データベーススキーマ](#データベーススキーマ)
6. [実装済み機能](#実装済み機能)
7. [未実装機能](#未実装機能)
8. [トラブルシューティング](#トラブルシューティング)
9. [Git管理](#git管理)
10. [ライセンス・作成者](#ライセンス作成者)

---

## プロジェクト概要

NiwaLogは、造園・庭園管理業務における現場ごとの詳細情報を蓄積・管理するWebアプリケーションです。

### 業務背景・目的

- 現場ごとの基本情報（設備・移動費など）を一元管理
- 案件（実施日ごとの作業）の記録と振り返り
- 従業員の稼働時間管理と経費記録
- 収益性分析と業務改善の可視化

### 主要機能概要

- **現場マスタ管理**: 現場情報のCRUD、検索機能
- **案件管理**: 実施日ごとの作業記録、自動採番
- **日別作業記録**: 複数日作業の管理と従事者稼働記録
- **経費管理**: 案件ごとの経費記録と合計計算
- **ダッシュボード**: サマリー表示、月別グラフ、従業員稼働分析

---

## 技術スタック

| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|----------|------|
| フロントエンド | React | 19.2.0 | UI構築 |
| ビルドツール | Vite | 7.2.4 | 開発環境 |
| 言語 | TypeScript | ~5.9.3 | 型安全性 |
| UIコンポーネント | Radix UI | 各種 ^1.x-^2.x | アクセシビリティ |
| スタイリング | Tailwind CSS | 3.4.17 | デザイン |
| フォーム管理 | React Hook Form | 7.70.0 | フォーム制御 |
| バリデーション | Zod | 4.3.5 | スキーマ検証 |
| データベース | Supabase JS | 2.90.1 | PostgreSQL + Auth |
| 通知 | Sonner | 2.0.7 | トースト通知 |
| アイコン | Lucide React | 0.562.0 | UIアイコン |
| グラフ | Recharts | 3.6.0 | データ可視化 |

---

## 開発環境のセットアップ

### 前提条件

- **Node.js** 18以上
- **Docker Desktop**（Supabaseローカル環境用）
- **Git**

### セットアップ手順

#### 1. リポジトリクローン

```bash
git clone https://github.com/lietsee/niwalog-app.git
cd niwalog-app
```

#### 2. 依存関係インストール

```bash
npm install
```

#### 3. Supabaseローカル起動

```bash
npx supabase start
```

起動後、以下の情報が表示されます:
- API URL (通常: `http://127.0.0.1:54621`)
- anon key
- service_role key

#### 4. 環境変数設定

`.env.local.example`をコピーして`.env.local`を作成:

```bash
cp .env.local.example .env.local
```

`.env.local`の内容:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54621
VITE_SUPABASE_ANON_KEY=<Supabase起動時に表示されたanon key>
```

#### 5. テストユーザー作成

```bash
psql postgresql://postgres:postgres@127.0.0.1:54622/postgres
```

psql接続後、以下のSQLを実行:

```sql
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  '',
  '',
  '',
  ''
);
```

#### 6. サンプルデータ投入（オプション）

テストユーザーのIDを確認:

```sql
SELECT id FROM auth.users WHERE email = 'test@example.com';
```

サンプル現場データを投入:

```sql
INSERT INTO fields (field_code, field_name, customer_name, address, has_electricity, has_water, has_toilet, toilet_distance, travel_distance_km, travel_time_minutes, travel_cost, notes, warnings, created_by)
VALUES
  ('KT-0001', '金城公園', '名古屋市様', '愛知県名古屋市北区金城1-1-1', true, true, false, '徒歩3分', 5.2, 15, 500, '駐車スペース2台分あり', '交通量多いため注意', '<上記で取得したID>'),
  ('SB-0002', '鈴木邸', '鈴木様', '愛知県名古屋市昭和区御器所3-10-5', false, false, false, '車で5分', 8.0, 20, 800, '道路が狭い', '電線注意', '<上記で取得したID>'),
  ('NG-0003', '長久手緑地', '長久手市役所', '愛知県長久手市岩作三ヶ峯1-1', true, true, true, NULL, 12.5, 30, 1200, 'トイレ利用可能', '傾斜地多し', '<上記で取得したID>');
```

#### 7. 開発サーバー起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` にアクセス。

#### 8. ログイン

- **メールアドレス**: test@example.com
- **パスワード**: password123

### 利用可能なスクリプト

- `npm run dev` - 開発サーバー起動（localhost:5173）
- `npm run build` - 本番ビルド
- `npm run preview` - ビルド後プレビュー
- `npm run lint` - ESLint実行
- `npx supabase start` - Supabaseローカル起動
- `npx supabase stop` - Supabaseローカル停止
- `npx supabase db reset` - データベースリセット（マイグレーション再実行）

---

## プロジェクト構造

```
niwalog-app/
├── src/
│   ├── lib/                      # API層とユーティリティ
│   │   ├── supabaseClient.ts     # Supabase初期化
│   │   ├── types.ts              # 共通型定義
│   │   ├── fieldsApi.ts          # 現場API（全CRUD + 検索）
│   │   ├── projectsApi.ts        # 案件API（全CRUD + 自動採番）
│   │   ├── workDaysApi.ts        # 作業日API（全CRUD + 自動採番）
│   │   ├── workRecordsApi.ts     # 従事者稼働API（CRUD + 一括作成）
│   │   ├── expensesApi.ts        # 経費API（CRUD + 合計計算）
│   │   ├── dashboardApi.ts       # ダッシュボードAPI（集計・統計）
│   │   ├── errorMessages.ts      # エラーメッセージ翻訳
│   │   └── utils.ts              # ユーティリティ関数
│   ├── pages/                    # ページコンポーネント
│   │   ├── LoginPage.tsx         # ログイン画面
│   │   ├── DashboardPage.tsx     # ダッシュボード（トップページ）
│   │   ├── FieldListPage.tsx     # 現場一覧・検索・削除
│   │   ├── FieldFormPage.tsx     # 現場作成・編集フォーム
│   │   ├── ProjectListPage.tsx   # 案件一覧・削除
│   │   ├── ProjectFormPage.tsx   # 案件作成・編集フォーム
│   │   ├── ProjectDetailPage.tsx # 案件詳細（作業日・経費タブ）
│   │   ├── WorkDayFormPage.tsx   # 作業日作成・編集フォーム
│   │   └── ExpenseFormPage.tsx   # 経費作成・編集フォーム
│   ├── components/               # UIコンポーネント
│   │   ├── ui/                   # Radix UI ベースコンポーネント
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── label.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── tabs.tsx          # タブUI
│   │   │   └── alert-dialog.tsx  # 確認ダイアログ
│   │   ├── FieldCard.tsx         # 現場カード表示
│   │   ├── ProjectCard.tsx       # 案件カード表示
│   │   ├── WorkDayCard.tsx       # 作業日カード表示
│   │   ├── ExpenseCard.tsx       # 経費カード表示
│   │   ├── WeatherInput.tsx      # 天候入力（動的配列）
│   │   ├── WorkRecordInput.tsx   # 従事者入力（動的配列）
│   │   ├── StatCard.tsx          # サマリーカード
│   │   ├── MonthlyChart.tsx      # 月別グラフ（Recharts）
│   │   ├── RecentProjectList.tsx # 直近案件リスト
│   │   └── EmployeeHoursTable.tsx # 従業員稼働テーブル
│   ├── schemas/                  # Zodバリデーションスキーマ
│   │   ├── fieldSchema.ts
│   │   ├── projectSchema.ts
│   │   ├── workDaySchema.ts      # 作業日バリデーション
│   │   └── expenseSchema.ts      # 経費バリデーション
│   ├── App.tsx                   # ルーティング・認証チェック
│   └── main.tsx                  # エントリーポイント
├── supabase/
│   ├── config.toml               # Supabaseローカル設定
│   └── migrations/
│       └── 20260110000000_initial_schema.sql  # 全テーブル定義
├── .env.local.example            # 環境変数サンプル
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## データベーススキーマ

### 5.1 メインテーブル

#### fields（現場マスタ）

現場の基本情報と設備情報を管理。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| id | UUID | PRIMARY KEY | 現場ID（自動生成） |
| field_code | VARCHAR(50) | UNIQUE NOT NULL | 現場コード（例: KT-0001） |
| field_name | VARCHAR(255) | NOT NULL | 現場名（例: 金城公園） |
| customer_name | VARCHAR(255) | NULL | 顧客名 |
| address | TEXT | NULL | 現場住所 |
| has_electricity | BOOLEAN | DEFAULT FALSE | 電気使用可否 |
| has_water | BOOLEAN | DEFAULT FALSE | 水道利用可否 |
| has_toilet | BOOLEAN | DEFAULT FALSE | トイレ使用可否 |
| toilet_distance | VARCHAR(100) | NULL | トイレまでの距離（例: 徒歩5分） |
| travel_distance_km | NUMERIC(10, 2) | NULL | 往復移動距離（km） |
| travel_time_minutes | INTEGER | NULL | 往復移動時間（分） |
| travel_cost | INTEGER | NULL | 往復移動費（円） |
| notes | TEXT | NULL | 現場備考 |
| warnings | TEXT | NULL | 注意事項 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新日時（自動） |
| created_by | UUID | FK → auth.users(id) | 作成者 |

**インデックス:**
- `idx_fields_code` on `field_code`
- `idx_fields_created_by` on `created_by`

**RLSポリシー:**
- SELECT: 全ユーザーが閲覧可能
- INSERT: 認証済みユーザーが作成可能（created_by = auth.uid()）
- UPDATE: 認証済みユーザー全員が更新可能
- DELETE: 認証済みユーザー全員が削除可能

#### projects（案件）

1つの現場で実施する案件（実施日ごと）を記録。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| id | UUID | PRIMARY KEY | 案件ID（自動生成） |
| field_id | UUID | FK → fields(id) ON DELETE RESTRICT | 現場ID |
| project_number | INTEGER | NOT NULL | 現場内案件番号（#1, #2...） |
| implementation_date | DATE | NOT NULL | 実施日 |
| work_type_pruning | BOOLEAN | NULL | 剪定作業 |
| work_type_weeding | BOOLEAN | NULL | 除草作業 |
| work_type_cleaning | BOOLEAN | NULL | 清掃作業 |
| work_type_other | VARCHAR(255) | NULL | その他作業内容 |
| estimate_amount | INTEGER | NULL | 見積金額 |
| invoice_amount | INTEGER | NULL | 請求金額 |
| labor_cost | INTEGER | NULL | 人件費（手入力） |
| expense_total | INTEGER | NULL | 経費合計（自動計算） |
| review_good_points | TEXT | NULL | 良かった点 |
| review_improvements | TEXT | NULL | 改善点 |
| review_next_actions | TEXT | NULL | 次回への申し送り |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新日時（自動） |
| created_by | UUID | FK → auth.users(id) | 作成者 |

**複合ユニーク制約:** `(field_id, project_number)`

**インデックス:**
- `idx_projects_field` on `field_id`
- `idx_projects_date` on `implementation_date DESC`

**RLSポリシー:**
- SELECT: 全ユーザーが閲覧可能
- INSERT: 認証済みユーザーが作成可能（created_by = auth.uid()）
- UPDATE: 認証済みユーザー全員が更新可能
- DELETE: 認証済みユーザー全員が削除可能

#### work_days（日別作業記録）

1つの案件を複数日に分けて作業する場合の日別記録。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| id | UUID | PRIMARY KEY | 記録ID（自動生成） |
| project_id | UUID | FK → projects(id) ON DELETE RESTRICT | 案件ID |
| work_date | DATE | NOT NULL | 作業日 |
| day_number | INTEGER | NOT NULL | 作業日の連番（1日目、2日目...） |
| weather | JSONB | NULL | 時刻ごとの天候（例: [{"time":"08:00","condition":"晴れ,強風"}]） |
| work_description | TEXT | NULL | 作業内容詳細 |
| troubles | TEXT | NULL | トラブル・特記事項 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新日時（自動） |

**複合ユニーク制約:** `(project_id, day_number)`

**インデックス:**
- `idx_work_days_project` on `project_id`
- `idx_work_days_date` on `work_date DESC`

**RLSポリシー:**
- ALL: 認証済みユーザー全員が全操作可能

#### work_records（従事者稼働記録）

日別作業に従事した作業者の稼働時間記録。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| id | UUID | PRIMARY KEY | 記録ID（自動生成） |
| work_day_id | UUID | FK → work_days(id) ON DELETE RESTRICT | 作業日ID |
| employee_code | VARCHAR(50) | NOT NULL | 従業員コード |
| start_time | TIME | NOT NULL | 開始時刻 |
| end_time | TIME | NOT NULL | 終了時刻 |
| break_minutes | INTEGER | DEFAULT 60 | 休憩時間（分） |
| working_hours | NUMERIC(5, 2) | NULL | 稼働時間（自動計算: end_time - start_time - break_minutes） |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新日時（自動） |

**複合ユニーク制約:** `(work_day_id, employee_code)`

**インデックス:**
- `idx_work_records_work_day` on `work_day_id`
- `idx_work_records_employee` on `employee_code`

**RLSポリシー:**
- ALL: 認証済みユーザー全員が全操作可能

#### expenses（経費）

案件に紐づく経費記録。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| id | UUID | PRIMARY KEY | 経費ID（自動生成） |
| project_id | UUID | FK → projects(id) ON DELETE RESTRICT | 案件ID |
| expense_item | VARCHAR(255) | NOT NULL | 経費項目（例: ガソリン代） |
| amount | INTEGER | NOT NULL | 金額 |
| notes | TEXT | NULL | 備考 |
| expense_date | DATE | NULL | 経費発生日 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新日時（自動） |

**インデックス:**
- `idx_expenses_project` on `project_id`
- `idx_expenses_date` on `expense_date DESC`

**RLSポリシー:**
- ALL: 認証済みユーザー全員が全操作可能

### 5.2 履歴テーブル

DELETE/UPDATE時に自動的にデータを退避する履歴テーブル。

**テーブル一覧:**
- `fields_history`
- `projects_history`
- `work_days_history`
- `work_records_history`
- `expenses_history`

**共通カラム（元テーブルのカラム + 以下）:**
- `history_id`: UUID PRIMARY KEY（履歴ID）
- `operation_type`: VARCHAR(10)（UPDATE or DELETE）
- `operation_at`: TIMESTAMPTZ（操作日時）
- `operation_by`: UUID（操作者）
- `reason`: TEXT（理由・備考）

**RLSポリシー:**
- SELECT: 全ユーザーが閲覧可能
- INSERT: システムのみ（トリガー経由）

### 5.3 トリガー・関数

#### 1. update_updated_at_column()

すべてのメインテーブルで`updated_at`を自動更新。

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルに適用
CREATE TRIGGER update_fields_updated_at BEFORE UPDATE ON fields FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- (projects, work_days, work_records, expenses も同様)
```

#### 2. calculate_working_hours()

`work_records`の`working_hours`を自動計算（end_time - start_time - break_minutes）。

```sql
CREATE OR REPLACE FUNCTION calculate_working_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- 稼働時間 = (終了時刻 - 開始時刻) - 休憩時間
  NEW.working_hours := (EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600)
                       - (COALESCE(NEW.break_minutes, 60) / 60.0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_working_hours BEFORE INSERT OR UPDATE ON work_records FOR EACH ROW EXECUTE FUNCTION calculate_working_hours();
```

#### 3. archive_*_to_history()

DELETE/UPDATE時に履歴テーブルにデータを自動コピー（各テーブルごと）。

```sql
CREATE OR REPLACE FUNCTION archive_fields_to_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO fields_history (id, field_code, ..., operation_type, operation_at, operation_by)
  VALUES (OLD.id, OLD.field_code, ..., TG_OP, NOW(), auth.uid());
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER archive_fields_trigger AFTER UPDATE OR DELETE ON fields FOR EACH ROW EXECUTE FUNCTION archive_fields_to_history();
-- (projects, work_days, work_records, expenses も同様)
```

### 5.4 ビュー

#### fields_full_history

現在の`fields`テーブルと`fields_history`を統合したビュー。

```sql
CREATE VIEW fields_full_history AS
SELECT id, field_code, field_name, ..., 'CURRENT' as operation_type, updated_at as operation_at, created_by as operation_by
FROM fields
UNION ALL
SELECT id, field_code, field_name, ..., operation_type, operation_at, operation_by
FROM fields_history
ORDER BY operation_at DESC;
```

### 5.5 リアルタイム購読設定

すべてのメインテーブルでSupabase Realtimeが有効化されています。

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE fields;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE work_days;
ALTER PUBLICATION supabase_realtime ADD TABLE work_records;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
```

---

## 実装済み機能

### Phase 1: 認証機能（完了 ✅）

**実装内容:**
- Supabase Auth（メール/パスワード認証）
- ログイン画面（LoginPage.tsx）
- セッション管理（App.tsx）
- 自動ログインチェック

**主要ファイル:**
- `src/pages/LoginPage.tsx`: ログインフォーム、エラー表示
- `src/lib/supabaseClient.ts`: Supabase初期化
- `src/App.tsx`: ルーティング、認証状態管理

**機能:**
- メールアドレス・パスワードでログイン
- ログイン失敗時のエラーメッセージ表示
- セッション維持（リロード後も自動ログイン）
- ログアウト機能

### Phase 2: 現場マスタ管理（完了 ✅）

**実装内容:**
- 現場CRUD（作成・読取・更新・削除）
- 統合検索機能（現場コード・現場名・住所・顧客名）
- フォームバリデーション（Zod）
- エラーメッセージ日本語化
- トースト通知（Sonner）
- 削除時の履歴自動退避

**主要ファイル:**
- `src/pages/FieldListPage.tsx`: 現場一覧・検索・削除
- `src/pages/FieldFormPage.tsx`: 現場作成・編集フォーム
- `src/components/FieldCard.tsx`: 現場カード表示
- `src/lib/fieldsApi.ts`: 現場API（全CRUD + 検索）
- `src/schemas/fieldSchema.ts`: Zodバリデーションスキーマ
- `src/lib/errorMessages.ts`: エラーメッセージ翻訳

**機能詳細:**

#### 現場一覧（FieldListPage）
- 全現場を現場コード順に表示
- 検索機能（現場コード・現場名・住所・顧客名を対象）
- 検索結果のリアルタイム表示
- 「新規登録」ボタン
- 各現場に「編集」「削除」ボタン
- 削除確認ダイアログ
- ローディング表示
- エラー表示

#### 現場作成・編集（FieldFormPage）
- フォームセクション:
  - 基本情報（現場コード、現場名、顧客名、住所）
  - 現場環境（電気・水道・トイレの有無、トイレまでの距離）
  - 移動費情報（往復移動距離・時間・費用）
  - 備考・注意事項
- リアルタイムバリデーション
- エラーメッセージ表示（日本語）
- 保存成功時のトースト通知
- キャンセルボタン

#### API層（fieldsApi.ts）
- `listAllFields()`: 全現場取得
- `getFieldById(id)`: ID指定で現場取得
- `searchFieldsByCode(term)`: 現場コード検索
- `searchFieldsByName(term)`: 現場名検索
- `searchFields(term)`: 統合検索（コード・名・住所・顧客名）
- `createField(field)`: 現場作成（created_byを自動設定）
- `updateField(id, field)`: 現場更新
- `deleteField(id)`: 現場削除（履歴に自動退避）

#### エラーハンドリング
- Supabaseエラーの日本語翻訳
- 重複エラー（現場コード）
- RLSポリシー違反
- NOT NULL制約違反
- 外部キー制約違反
- バリデーションエラー（Zod）

#### バリデーション（fieldSchema.ts）
- 現場コード: 必須、50文字以内
- 現場名: 必須、255文字以内
- 顧客名: 255文字以内
- 移動距離: 0以上、NaN対応
- 移動時間: 整数、0以上、NaN対応
- 移動費: 整数、0以上、NaN対応

### Phase 3: 案件管理（完了 ✅）

**実装内容:**
- 案件CRUD（作成・読取・更新・削除）
- 現場カードクリックで案件一覧へ遷移
- 案件番号の自動採番（編集可能）
- フォームバリデーション（Zod）
- 削除時の履歴自動退避

**主要ファイル:**
- `src/pages/ProjectListPage.tsx`: 案件一覧・削除
- `src/pages/ProjectFormPage.tsx`: 案件作成・編集フォーム
- `src/components/ProjectCard.tsx`: 案件カード表示
- `src/lib/projectsApi.ts`: 案件API（全CRUD + 自動採番）
- `src/schemas/projectSchema.ts`: Zodバリデーションスキーマ

**機能詳細:**

#### 画面遷移
```
現場一覧 → 現場カードをクリック → 案件一覧 → 案件作成/編集
```

#### 案件一覧（ProjectListPage）
- 現場情報をヘッダーに表示（現場コード、現場名、顧客名）
- 案件一覧をカードで表示（実施日降順）
- 「新規案件」ボタン
- 各案件に「編集」「削除」ボタン
- 削除確認ダイアログ
- 戻るボタンで現場一覧へ

#### 案件作成・編集（ProjectFormPage）
- フォームセクション:
  - 基本情報（案件番号、実施日）
  - 作業内容（剪定・除草・清掃チェックボックス、その他作業内容）
  - 金額情報（見積金額、請求金額、人件費）
  - 振り返り（良かった点、改善点、次回への申し送り）
- 案件番号は自動採番（現場ごとに連番）、ただし編集可能
- 実施日は新規作成時に今日の日付がデフォルト
- リアルタイムバリデーション
- 保存成功時のトースト通知

#### API層（projectsApi.ts）
- `listProjectsByField(fieldId)`: 現場ごとの案件一覧取得
- `getProjectById(id)`: 案件詳細取得
- `getProjectWithField(id)`: 現場情報付きで案件取得
- `getNextProjectNumber(fieldId)`: 次の案件番号を取得（自動採番用）
- `createProject(project)`: 案件作成（created_byを自動設定）
- `updateProject(id, project)`: 案件更新
- `deleteProject(id)`: 案件削除（履歴に自動退避）

#### バリデーション（projectSchema.ts）
- 案件番号: 必須、1以上の整数
- 実施日: 必須
- 作業種別: チェックボックス（複数選択可）
- その他作業内容: 255文字以内
- 見積金額: 0以上の整数（任意）
- 請求金額: 0以上の整数（任意）
- 人件費: 0以上の整数（任意）
- 振り返り項目: テキスト（任意）

### Phase 4: 日別作業記録・従事者稼働・経費管理（完了 ✅）

**実装内容:**
- 日別作業記録CRUD（作成・読取・更新・削除）
- 従事者稼働記録CRUD（作業日フォーム内インライン編集）
- 経費CRUD（案件ごとの経費管理）
- 天候情報の動的配列入力
- タブUIによる作業日・経費切替
- 削除確認ダイアログ

**主要ファイル:**
- `src/pages/ProjectDetailPage.tsx`: 案件詳細（作業日・経費タブ）
- `src/pages/WorkDayFormPage.tsx`: 作業日作成・編集フォーム
- `src/pages/ExpenseFormPage.tsx`: 経費作成・編集フォーム
- `src/components/WorkDayCard.tsx`: 作業日カード表示
- `src/components/ExpenseCard.tsx`: 経費カード表示
- `src/components/WeatherInput.tsx`: 天候入力（動的配列）
- `src/components/WorkRecordInput.tsx`: 従事者入力（動的配列）
- `src/lib/workDaysApi.ts`: 作業日API
- `src/lib/workRecordsApi.ts`: 従事者稼働API
- `src/lib/expensesApi.ts`: 経費API
- `src/schemas/workDaySchema.ts`: 作業日バリデーション
- `src/schemas/expenseSchema.ts`: 経費バリデーション

**機能詳細:**

#### 画面遷移
```
現場一覧 → 案件一覧 → 案件カードクリック → 案件詳細（タブ）
                                           ├→ 作業日タブ → 作業日フォーム
                                           └→ 経費タブ → 経費フォーム
```

#### 案件詳細（ProjectDetailPage）
- タブUIで「作業日」「経費」を切替
- 作業日タブ:
  - 作業日一覧をカードで表示（日番号順）
  - 「作業日を追加」ボタン
  - 各カードに編集・削除・複製ボタン
  - 複製機能: 作業日データ（天候・作業内容・従事者稼働）を全て複製
- 経費タブ:
  - 経費一覧をカードで表示
  - 経費合計金額を表示
  - 「経費を追加」ボタン
  - 各カードに編集・削除ボタン
- 削除確認ダイアログ（AlertDialog）

#### 作業日フォーム（WorkDayFormPage）
- フォームセクション:
  - 基本情報（作業日、日番号）
  - 天候情報（動的配列: 時刻 + 天候）
  - 作業内容（作業内容詳細、トラブル・特記事項）
  - 従事者稼働（動的配列: 従業員コード + 開始時刻 + 終了時刻）
- 日番号は自動採番（案件ごとに連番）、編集可能
- 天候エントリの動的追加・削除
- 従事者エントリの動的追加・削除

#### 経費フォーム（ExpenseFormPage）
- フィールド:
  - 項目名（必須）
  - 金額（必須）
  - 使用日（任意）
  - 備考（任意）

#### API層

**workDaysApi.ts:**
- `listWorkDaysByProject(projectId)`: 案件ごとの作業日一覧取得
- `getWorkDayById(id)`: 作業日詳細取得
- `getWorkDayWithRecords(id)`: 従事者記録付きで作業日取得
- `getNextDayNumber(projectId)`: 次の日番号を取得（自動採番用）
- `createWorkDay(workDay)`: 作業日作成
- `updateWorkDay(id, workDay)`: 作業日更新
- `deleteWorkDay(id)`: 作業日削除

**workRecordsApi.ts:**
- `listWorkRecordsByWorkDay(workDayId)`: 作業日ごとの従事者記録取得
- `createWorkRecord(record)`: 従事者記録作成
- `createWorkRecords(records)`: 従事者記録一括作成
- `updateWorkRecord(id, record)`: 従事者記録更新
- `deleteWorkRecord(id)`: 従事者記録削除

**expensesApi.ts:**
- `listExpensesByProject(projectId)`: 案件ごとの経費一覧取得
- `getExpenseById(id)`: 経費詳細取得
- `getTotalExpensesByProject(projectId)`: 案件ごとの経費合計取得
- `createExpense(expense)`: 経費作成
- `updateExpense(id, expense)`: 経費更新
- `deleteExpense(id)`: 経費削除

#### バリデーション

**workDaySchema.ts:**
- 日番号: 必須、1以上の整数
- 作業日: 必須
- 天候: 配列（各エントリ: 時刻 + 天候）
- 作業内容詳細: テキスト（任意）
- トラブル: テキスト（任意）
- 従事者: 配列（各エントリ: 従業員コード + 開始時刻 + 終了時刻）

**expenseSchema.ts:**
- 項目名: 必須、255文字以内
- 金額: 必須、0以上の整数
- 使用日: 任意
- 備考: 任意

### Phase 5: ダッシュボード・分析機能（完了 ✅）

**実装内容:**
- サマリーカード（現場数、案件数、今月売上/経費/人件費）
- 月別売上・経費推移グラフ（Recharts棒グラフ）
- 直近案件リスト表示
- 従業員稼働時間サマリーテーブル
- ログイン後はダッシュボードがトップページ

**主要ファイル:**
- `src/pages/DashboardPage.tsx`: ダッシュボードメインページ
- `src/lib/dashboardApi.ts`: ダッシュボードAPI
- `src/components/StatCard.tsx`: サマリーカードコンポーネント
- `src/components/MonthlyChart.tsx`: 月別グラフ（Recharts）
- `src/components/RecentProjectList.tsx`: 直近案件リスト
- `src/components/EmployeeHoursTable.tsx`: 従業員稼働テーブル

**機能詳細:**

#### 画面構成
```
┌──────────────────────────────────────────────────────────┐
│ ダッシュボード                          [現場一覧] [ログアウト] │
├──────────────────────────────────────────────────────────┤
│ [現場数] [案件数] [今月売上] [今月経費] [今月人件費]           │
├──────────────────────────────────────────────────────────┤
│ [月別売上・経費推移グラフ]      │ [直近の案件リスト]         │
├──────────────────────────────────────────────────────────┤
│ [今月の従業員稼働テーブル]                                  │
└──────────────────────────────────────────────────────────┘
```

#### API層（dashboardApi.ts）
- `getDashboardSummary()`: サマリー情報取得（現場数、案件数、今月の売上/経費/人件費）
- `getMonthlyStats(months)`: 月別集計取得（過去N ヶ月分）
- `getRecentProjects(limit)`: 直近案件取得
- `getEmployeeWorkSummary()`: 今月の従業員稼働サマリー取得

---

### Phase 6: 高度な分析・エクスポート機能（完了 ✅）

**実装内容:**
- 現場別収益性レポート
- 期間指定分析（日付範囲選択）
- 案件レビュー一覧
- 履歴表示機能（現場・案件）
- CSVエクスポート機能

**主要ファイル:**
- `src/pages/AnalysisPage.tsx`: 分析ページ（レポート・レビュー・履歴タブ）
- `src/lib/analysisApi.ts`: 分析API（収益性レポート、レビュー一覧）
- `src/lib/historyApi.ts`: 履歴API（現場・案件履歴）

**機能詳細:**

#### 分析ページ（AnalysisPage）
- タブUIで「収益性レポート」「レビュー一覧」「履歴」を切替
- 期間指定（開始日・終了日）での絞り込み

#### 収益性レポートタブ
- 現場別の売上・人件費・経費・粗利益・粗利益率を表形式で表示
- 案件数も表示
- CSVエクスポート機能

#### レビュー一覧タブ
- 期間内の案件レビュー（良かった点・改善点・次回申し送り）を一覧表示
- 現場名・案件番号・実施日付き

#### 履歴タブ
- サブタブで「現場履歴」「案件履歴」を切替
- 操作種別（CURRENT/UPDATE/DELETE）のバッジ表示
- 操作日時・操作者表示
- 検索機能

---

## 未実装機能

### カスケード削除機能（将来実装予定）

**概要:** 現場削除時に関連データを一括で履歴テーブルに退避してから削除する機能。

**現状の挙動:**
- 現場に関連する案件が存在する場合、外部キー制約（ON DELETE RESTRICT）により削除不可
- エラーメッセージ:「この現場には関連する案件が存在するため削除できません。先に案件を削除してください。」

**将来の実装内容:**

#### 事前チェック機能
- 削除前に関連データ件数を表示
  - 関連案件数
  - 関連作業日数
  - 関連従事者記録数
  - 関連経費数
- ユーザーに確認ダイアログを表示

#### カスケード削除処理
削除時は以下の順序で履歴テーブルに退避後、削除:
1. `work_records`（従事者稼働記録）→ `work_records_history`
2. `work_days`（日別作業記録）→ `work_days_history`
3. `expenses`（経費）→ `expenses_history`
4. `projects`（案件）→ `projects_history`
5. `fields`（現場）→ `fields_history`

**注記:**
- 物理削除 + 履歴テーブル方式（論理削除ではない）
- 削除されたデータは履歴テーブルから参照可能
- トリガーにより自動的に履歴テーブルへ退避される

### その他の未実装機能

#### エクスポート機能拡張
- Excel形式エクスポート
- レポート印刷機能（PDF出力）

#### 分析機能拡張
- 移動費率分析
- 案件数推移グラフ
- 従業員別稼働分析（期間指定）

---

## トラブルシューティング

### Supabaseローカル環境が起動しない

```bash
# Dockerが起動しているか確認
docker ps

# Supabaseコンテナを停止して再起動
npx supabase stop
npx supabase start
```

### データベースリセット後にテストユーザーがいない

```bash
# psqlで接続してテストユーザーを再作成
psql postgresql://postgres:postgres@127.0.0.1:54622/postgres
```

上記の「テストユーザー作成」のSQLを再実行してください。

### ログイン時に403エラー

- RLSポリシーの確認
- auth.usersにユーザーが存在するか確認

```sql
SELECT * FROM auth.users WHERE email = 'test@example.com';
```

### 現場更新時に406エラー

- RLSポリシーのUSING句・WITH CHECK句を確認
- created_byがNULLでないか確認

```sql
SELECT id, field_code, created_by FROM fields;
```

### Tailwind CSS v4エラー

- Tailwind CSS 3.4.17にダウングレード済み
- `tailwind.config.js`でCSS変数設定済み

問題が発生した場合は、`package.json`でTailwind CSSのバージョンを確認してください。

---

## Git管理

**リモートリポジトリ:** https://github.com/lietsee/niwalog-app

**ブランチ:** main

**コミット履歴（最新）:**
1. `7ebd294` - feat: Phase 5 ダッシュボード・分析機能を実装
2. `0c654a2` - docs: Phase 4完了に伴うREADME更新
3. `492123e` - feat: Phase 4 日別作業記録・従事者稼働・経費管理機能を実装
4. `d7f6a42` - feat: Phase 3 案件管理機能を実装
5. `20e89ea` - docs: 包括的なドキュメント作成（開発中断・再開用）
6. `b22964e` - fix: RLSポリシーを変更し全認証ユーザーが編集可能に
7. `b3bd71c` - fix: Downgrade Tailwind CSS to v3.4.17 and configure CSS variables
8. `d74e368` - feat: Phase 2 現場マスタ管理（Fields CRUD）完成
9. `67ba474` - feat: Phase 1 authentication and basic UI components

---

## ライセンス・作成者

- **ライセンス:** MIT
- **作成者:** Claude Code with lietsee
