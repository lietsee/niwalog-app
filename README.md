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
- **月次経費管理**: 固定費・変動費の月次管理
- **営業日数管理**: 年度別の営業日数・臨時休業日数管理
- **年間契約管理**: 年間契約の月次収益按分計算（進行基準）
- **自動距離計算**: 住所からの片道移動距離・時間の自動計算
- **ダッシュボード**: サマリー表示、月別グラフ、従業員稼働分析、粗利計算
- **認証**: パスワードログイン、マジックリンクログイン（メール認証）

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

**重要:** auth.usersテーブルへの直接SQLインサートは使用しないでください。Supabase auth APIを使用する必要があります。

Supabase起動後に表示されるservice_role keyを使用して、以下のコマンドでテストユーザーを作成:

```bash
# service_role keyを取得
SERVICE_ROLE_KEY=$(npx supabase status --output json | jq -r '.SERVICE_ROLE_KEY')

# テストユーザーを作成（email_confirm: trueで即座にログイン可能）
curl -X POST 'http://127.0.0.1:54621/auth/v1/admin/users' \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testtest",
    "email_confirm": true
  }'
```

**なぜSQLではダメなのか:**
- auth.usersテーブルには`confirmation_token`等のカラムがあり、auth serviceはこれらがNULLでないことを期待する
- 直接SQLでインサートするとこれらの値が不正な状態になり、ログイン時に500エラーが発生する
- Supabase auth admin APIは必要なカラムを全て正しく設定してくれる

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

**重要: テストデータのUUIDについて**

テストデータでUUIDカラム（id, field_id, project_id等）に値を指定する場合、**必ず`gen_random_uuid()`を使用**してください。

```sql
-- NG: 手動で作成した偽UUID（RFC 4122に準拠していない）
INSERT INTO fields (id, ...) VALUES ('11111111-1111-1111-1111-111111111111', ...);

-- OK: gen_random_uuid()を使用
INSERT INTO fields (id, ...) VALUES (gen_random_uuid(), ...);

-- OK: idを省略（デフォルトでgen_random_uuid()が使用される）
INSERT INTO fields (field_code, ...) VALUES ('F001', ...);
```

**なぜ手動UUIDはダメなのか:**
- `11111111-1111-1111-1111-111111111111`のようなUUIDは、RFC 4122のバージョンビット（位置3の文字）が不正
- ZodのUUID検証（`z.string().uuid()`）がRFC 4122準拠をチェックするため、フォームバリデーションで失敗する
- エラー例: `{message: '現場IDが無効です', type: 'invalid_format'}`

#### 7. 開発サーバー起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` にアクセス。

#### 8. ログイン

- **メールアドレス**: test@example.com
- **パスワード**: testtest

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
│   │   ├── employeesApi.ts       # 従業員API（CRUD）
│   │   ├── laborCostApi.ts       # 人件費計算API
│   │   ├── monthlyCostsApi.ts    # 月次経費API（CRUD）
│   │   ├── annualContractsApi.ts # 年間契約API（CRUD + 月次収益計算）
│   │   ├── settingsApi.ts        # 設定API（基準住所等）
│   │   ├── distanceApi.ts        # 距離計算API（Edge Function呼び出し）
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
│   │   ├── ExpenseFormPage.tsx   # 経費作成・編集フォーム
│   │   ├── EmployeeListPage.tsx  # 従業員一覧・検索
│   │   ├── EmployeeFormPage.tsx  # 従業員作成・編集フォーム
│   │   ├── MonthlyCostPage.tsx   # 月次経費管理（固定費・変動費）
│   │   ├── AnnualContractListPage.tsx   # 年間契約一覧
│   │   ├── AnnualContractFormPage.tsx   # 年間契約作成・編集フォーム
│   │   ├── AnnualContractDetailPage.tsx # 年間契約詳細・月次配分表
│   │   └── SettingsPage.tsx             # 設定画面（基準住所）
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
│   │   │   ├── alert-dialog.tsx  # 確認ダイアログ
│   │   │   ├── radio-group.tsx   # ラジオボタングループ
│   │   │   ├── select.tsx        # セレクトボックス
│   │   │   ├── progress.tsx      # プログレスバー
│   │   │   └── table.tsx         # テーブル
│   │   ├── FieldCard.tsx         # 現場カード表示
│   │   ├── ProjectCard.tsx       # 案件カード表示
│   │   ├── WorkDayCard.tsx       # 作業日カード表示
│   │   ├── ExpenseCard.tsx       # 経費カード表示
│   │   ├── WeatherInput.tsx      # 天候入力（動的配列）
│   │   ├── WorkRecordInput.tsx   # 従事者入力（動的配列）
│   │   ├── StatCard.tsx          # サマリーカード
│   │   ├── MonthlyChart.tsx      # 月別グラフ（Recharts）
│   │   ├── RecentProjectList.tsx # 直近案件リスト
│   │   ├── EmployeeHoursTable.tsx # 従業員稼働テーブル
│   │   ├── EmployeeCard.tsx      # 従業員カード表示
│   │   └── DateFilter.tsx        # 日付フィルターコンポーネント
│   ├── schemas/                  # Zodバリデーションスキーマ
│   │   ├── fieldSchema.ts
│   │   ├── projectSchema.ts
│   │   ├── workDaySchema.ts      # 作業日バリデーション
│   │   ├── expenseSchema.ts      # 経費バリデーション
│   │   ├── employeeSchema.ts     # 従業員バリデーション
│   │   ├── monthlyCostSchema.ts  # 月次経費バリデーション
│   │   └── settingsSchema.ts     # 設定バリデーション
│   ├── App.tsx                   # ルーティング・認証チェック
│   └── main.tsx                  # エントリーポイント
├── supabase/
│   ├── config.toml               # Supabaseローカル設定
│   ├── functions/
│   │   └── calculate-distance/
│   │       └── index.ts          # 距離計算Edge Function
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
| travel_distance_km | NUMERIC(10, 2) | NULL | 片道移動距離（km） |
| travel_time_minutes | INTEGER | NULL | 片道移動時間（分） |
| travel_cost | INTEGER | NULL | 片道移動費（円） |
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

日別作業に従事した作業者の稼働時間記録。4時刻方式で途中合流・途中離脱にも対応。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| id | UUID | PRIMARY KEY | 記録ID（自動生成） |
| work_day_id | UUID | FK → work_days(id) ON DELETE RESTRICT | 作業日ID |
| employee_code | VARCHAR(10) | NOT NULL | 従業員コード |
| clock_in | TIME | NULL | 出勤時間（土場）- 途中合流の場合はNULL |
| site_arrival | TIME | NOT NULL | 現場到着時間 |
| site_departure | TIME | NOT NULL | 現場撤収時間 |
| clock_out | TIME | NULL | 退勤時間（土場）- 途中離脱の場合はNULL |
| break_minutes | INTEGER | DEFAULT 60 | 休憩時間（分） |
| site_hours | DECIMAL(5,2) | NULL | 現場作業時間（自動計算: site_departure - site_arrival - break_minutes） |
| prep_hours | DECIMAL(5,2) | NULL | 準備・移動時間（自動計算: site_arrival - clock_in、clock_inがNULLの場合はNULL） |
| return_hours | DECIMAL(5,2) | NULL | 帰社時間（自動計算: clock_out - site_departure、clock_outがNULLの場合はNULL） |
| total_hours | DECIMAL(5,2) | NULL | 総拘束時間（自動計算: clock_out - clock_in、両方がある場合のみ） |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新日時（自動） |

**4時刻パターン:**
- 通常勤務: clock_in → site_arrival → site_departure → clock_out（4つすべて入力）
- 途中合流: site_arrival → site_departure → clock_out（clock_in = NULL）
- 途中離脱: clock_in → site_arrival → site_departure（clock_out = NULL）
- 途中合流・途中離脱: site_arrival → site_departure のみ（clock_in/clock_out = NULL）

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

#### employees（従業員マスタ）

従業員の基本情報と給与タイプを管理。人件費計算に使用。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| employee_code | VARCHAR(10) | PRIMARY KEY | 従業員コード（例: f001） |
| name | VARCHAR(100) | NOT NULL | 氏名 |
| salary_type | VARCHAR(10) | NOT NULL | 給与タイプ: hourly/daily/monthly |
| hourly_rate | INTEGER | NULL | 時給（円）- salary_type=hourly の場合 |
| daily_rate | INTEGER | NULL | 日給/月給（円）- salary_type=daily の場合は日給、salary_type=monthly の場合は月給を格納 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新日時（自動） |
| created_by | UUID | FK → auth.users(id) | 作成者 |

**給与タイプ:**
- `hourly`: 時給（人件費 = 時給 × 稼働時間）
- `daily`: 日給月給（人件費 = 日給 × 按分率）
- `monthly`: 月給（人件費 = (月給 ÷ 実稼働日数) × 按分率）※営業日数管理のデータを使用

**インデックス:**
- `idx_employees_salary_type` on `salary_type`

**RLSポリシー:**
- ALL: 認証済みユーザー全員が全操作可能

**削除方式:**
- 物理削除（履歴テーブル `employees_history` に自動退避）

#### monthly_costs（月次経費）

月ごとの固定費・変動費を管理。ダッシュボードの粗利計算に使用。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| id | UUID | PRIMARY KEY | 経費ID（自動生成） |
| year_month | VARCHAR(7) | NOT NULL | 対象年月（例: 2026-01） |
| cost_type | VARCHAR(20) | NOT NULL | 種別: fixed（固定費）/ variable（変動費） |
| category | VARCHAR(100) | NOT NULL | カテゴリ（例: 地代家賃、通信費） |
| amount | INTEGER | NOT NULL | 金額（円） |
| notes | TEXT | NULL | 備考 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新日時（自動） |
| created_by | UUID | FK → auth.users(id) | 作成者 |

**定型カテゴリ:**
- 固定費: 地代家賃、水道光熱費、通信費、保険料、リース料、その他
- 変動費: カード決済手数料、消耗品費、車両燃料費、その他

**インデックス:**
- `idx_monthly_costs_year_month` on `year_month`
- `idx_monthly_costs_cost_type` on `cost_type`

**RLSポリシー:**
- ALL: 認証済みユーザー全員が全操作可能

**削除方式:**
- 物理削除（履歴テーブル `monthly_costs_history` に自動退避）

#### annual_contracts（年間契約マスタ）

年間契約の基本情報と予算を管理。進行基準による月次収益認識に使用。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| id | UUID | PRIMARY KEY | 契約ID（自動生成） |
| field_id | UUID | FK → fields(id) ON DELETE RESTRICT | 現場ID |
| contract_name | VARCHAR(255) | NOT NULL | 契約名（例: 2026年度年間管理） |
| fiscal_year | INTEGER | NOT NULL | 年度（例: 2026） |
| contract_start_date | DATE | NOT NULL | 契約開始日 |
| contract_end_date | DATE | NOT NULL | 契約終了日 |
| contract_amount | INTEGER | NOT NULL | 年間契約額（円） |
| budget_hours | DECIMAL(10, 2) | NOT NULL, > 0 | 年間予算時間 |
| revenue_recognition_method | VARCHAR(20) | DEFAULT 'hours_based' | 収益認識方式 |
| is_settled | BOOLEAN | DEFAULT FALSE | 精算済みフラグ |
| settlement_adjustment | INTEGER | DEFAULT 0 | 精算調整額 |
| notes | TEXT | NULL | 備考 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新日時（自動） |
| created_by | UUID | FK → auth.users(id) | 作成者 |

**制約:**
- `CHECK (budget_hours > 0)`: 予算時間は0より大きい
- `CHECK (contract_start_date <= contract_end_date)`: 開始日 ≤ 終了日
- `UNIQUE (field_id, contract_name, fiscal_year)`: 同一現場・年度・契約名の重複不可

**インデックス:**
- `idx_annual_contracts_field` on `field_id`
- `idx_annual_contracts_fiscal_year` on `fiscal_year`

**RLSポリシー:**
- SELECT: 認証済みユーザーが閲覧可能
- INSERT: 認証済みユーザーが作成可能（created_by = auth.uid()）
- UPDATE: 認証済みユーザー全員が更新可能
- DELETE: 認証済みユーザー全員が削除可能

#### monthly_revenue_allocations（月次収益配分）

年間契約の月次収益を記録。稼働時間ベースの進行基準で計算。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| id | UUID | PRIMARY KEY | 配分ID（自動生成） |
| annual_contract_id | UUID | FK → annual_contracts(id) ON DELETE CASCADE | 年間契約ID |
| allocation_month | DATE | NOT NULL | 対象月（月初日、例: 2026-04-01） |
| actual_hours | DECIMAL(10, 2) | DEFAULT 0 | 当月実稼働時間 |
| cumulative_hours | DECIMAL(10, 2) | DEFAULT 0 | 累計稼働時間 |
| allocation_rate | DECIMAL(8, 6) | DEFAULT 0 | 配分率（当月時間 / 予算時間） |
| allocated_revenue | INTEGER | DEFAULT 0 | 当月認識収益（円） |
| cumulative_revenue | INTEGER | DEFAULT 0 | 累計認識収益（円） |
| adjustment_amount | INTEGER | DEFAULT 0 | 調整額（年度末精算用） |
| status | VARCHAR(20) | DEFAULT 'provisional' | ステータス: provisional/confirmed/adjusted |

**制約:**
- `CHECK (date_trunc('month', allocation_month) = allocation_month)`: 月初日のみ
- `UNIQUE (annual_contract_id, allocation_month)`: 同一契約・同一月の重複不可

**インデックス:**
- `idx_monthly_revenue_allocations_contract` on `annual_contract_id`
- `idx_monthly_revenue_allocations_month` on `allocation_month`

**RLSポリシー:**
- SELECT: 認証済みユーザーが閲覧可能
- INSERT/UPDATE/DELETE: 認証済みユーザー全員が操作可能

#### app_settings（アプリ設定）

アプリケーション全体の設定を保存するテーブル。基準住所などを管理。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 設定ID |
| setting_key | VARCHAR(100) | UNIQUE NOT NULL | 設定キー |
| setting_value | TEXT | NOT NULL | 設定値 |
| setting_type | VARCHAR(20) | DEFAULT 'string' | 型: string/number/boolean/json |
| description | TEXT | | 設定の説明 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 更新日時 |
| updated_by | UUID | FK → auth.users(id) | 更新者 |

**設定キー:**
- `base_address`: 基準住所（会社・事務所）
- `base_lat`: 基準住所の緯度
- `base_lng`: 基準住所の経度

**RLSポリシー:**
- SELECT: 認証済みユーザーが閲覧可能
- ALL: 認証済みユーザー全員が操作可能

#### projects（案件）の拡張

年間契約との紐付けのため、projectsテーブルに以下のカラムを追加。

| カラム名 | 型 | 制約 | 説明 |
|---------|---|------|------|
| contract_type | VARCHAR(20) | DEFAULT 'standard' | 契約種別: standard（通常）/ annual（年間契約） |
| annual_contract_id | UUID | FK → annual_contracts(id) ON DELETE SET NULL | 年間契約ID（年間契約の場合のみ） |

**契約種別による収益認識:**
- `standard`: 完了基準（implementation_dateの月に一括計上）
- `annual`: 進行基準（稼働時間比率で月次按分）

### 5.2 履歴テーブル

INSERT/UPDATE/DELETE時に自動的にデータを退避する履歴テーブル。

**テーブル一覧:**
- `fields_history`
- `projects_history`
- `work_days_history`
- `work_records_history`
- `expenses_history`
- `employees_history`
- `monthly_costs_history`
- `annual_contracts_history`
- `monthly_revenue_allocations_history`

**共通カラム（元テーブルのカラム + 以下）:**
- `history_id`: UUID PRIMARY KEY（履歴ID）
- `operation_type`: VARCHAR(10)（INSERT, UPDATE, DELETE, RESTORE）
- `operation_at`: TIMESTAMPTZ（操作日時）
- `operation_by`: UUID（操作者）
- `reason`: TEXT（理由・備考）

**operation_type値:**
| 値 | 説明 |
|-----|------|
| INSERT | 新規作成時に記録 |
| UPDATE | 更新時に変更前データを記録 |
| DELETE | 削除時に削除されるデータを記録 |
| RESTORE | 復元時に記録（employees_historyのみ） |

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

`work_records`の各時間カラムを自動計算（4時刻方式対応）。

```sql
CREATE OR REPLACE FUNCTION calculate_working_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- 現場作業時間 = 撤収 - 到着 - 休憩
  NEW.site_hours := (EXTRACT(EPOCH FROM (NEW.site_departure - NEW.site_arrival)) / 3600)
                    - (COALESCE(NEW.break_minutes, 60) / 60.0);

  -- 準備＋移動時間（clock_inがある場合のみ）
  IF NEW.clock_in IS NOT NULL AND NEW.site_arrival IS NOT NULL THEN
    NEW.prep_hours := EXTRACT(EPOCH FROM (NEW.site_arrival - NEW.clock_in)) / 3600;
  ELSE
    NEW.prep_hours := NULL;
  END IF;

  -- 帰社時間（clock_outがある場合のみ）
  IF NEW.site_departure IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
    NEW.return_hours := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.site_departure)) / 3600;
  ELSE
    NEW.return_hours := NULL;
  END IF;

  -- 総拘束時間（両方ある場合のみ）
  IF NEW.clock_in IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600;
  ELSE
    NEW.total_hours := NULL;
  END IF;

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
ALTER PUBLICATION supabase_realtime ADD TABLE employees;
ALTER PUBLICATION supabase_realtime ADD TABLE monthly_costs;
ALTER PUBLICATION supabase_realtime ADD TABLE annual_contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE monthly_revenue_allocations;
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
- 日付フィルター機能（年・年月・年月日での絞り込み）
- フォームバリデーション（Zod）
- エラーメッセージ日本語化
- トースト通知（Sonner）
- 削除時の履歴自動退避

**主要ファイル:**
- `src/pages/FieldListPage.tsx`: 現場一覧・検索・削除
- `src/pages/FieldFormPage.tsx`: 現場作成・編集フォーム
- `src/components/FieldCard.tsx`: 現場カード表示
- `src/components/DateFilter.tsx`: 日付フィルターコンポーネント
- `src/lib/fieldsApi.ts`: 現場API（全CRUD + 検索）
- `src/schemas/fieldSchema.ts`: Zodバリデーションスキーマ
- `src/lib/errorMessages.ts`: エラーメッセージ翻訳

**機能詳細:**

#### 現場一覧（FieldListPage）
- 全現場を現場コード順に表示
- 検索機能（現場コード・現場名・住所・顧客名を対象）
- **日付フィルター機能**: 案件の実施日で現場を絞り込み
  - 年のみ指定: その年に案件がある現場を表示
  - 年月指定: その年月に案件がある現場を表示
  - 年月日指定: その日に案件がある現場を表示
  - テキスト検索と組み合わせ可能（AND条件）
- 検索結果のリアルタイム表示
- 「新規登録」ボタン
- 各現場に「編集」「削除」ボタン
- 削除確認ダイアログ
- ローディング表示
- エラー表示
- **財務サマリー表示**: 各現場カードに請求額合計・費用合計を表示
  - 請求額合計（緑色）: 全案件のinvoice_amount合計
  - 費用合計（赤色）: Σ(人件費 + 経費) + (片道移動費 × 2 × 案件数)
  - 人件費未設定の案件がある場合は「?」アイコンを表示（クリックで警告メッセージ）

#### 現場作成・編集（FieldFormPage）
- フォームセクション:
  - 基本情報（現場コード、現場名、顧客名、住所）
  - 現場環境（電気・水道・トイレの有無、トイレまでの距離）
  - 移動費情報（片道移動距離・時間・費用）
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
- `searchFieldsWithDateFilter(term?, year?, month?, day?)`: 統合検索 + 日付フィルタ
- `getFieldIdsByDateFilter(year?, month?, day?)`: 日付条件で現場ID一覧取得
- `createField(field)`: 現場作成（created_byを自動設定）
- `updateField(id, field)`: 現場更新
- `deleteField(id)`: 現場削除（履歴に自動退避）
- `getFieldFinancialSummaries(fields)`: 現場の財務サマリー一括取得（請求額・費用合計・人件費未設定フラグ）

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
  - 従事者稼働（4時刻対応の動的配列）
- 日番号は自動採番（案件ごとに連番）、編集可能
- 天候エントリの動的追加・削除
- 従事者エントリの動的追加・削除・複製

#### 従事者稼働入力（WorkRecordInput）
4時刻方式に対応した入力UIを提供。

**入力フィールド（デスクトップ表示）:**
```
┌────────────────────────────────────────────────────────────────────────────┐
│ 従業員   │ 出勤   │ 現着   │ 撤収   │ 退勤   │ 休憩 │ 現場時間 │ [複製][×] │
│ [f001  ] │ [08:00]│ [08:30]│ [16:00]│ [17:00]│ [60] │   6.5h  │           │
└────────────────────────────────────────────────────────────────────────────┘
```

**特徴:**
- 出勤/退勤時刻は任意入力（クリアボタンで削除可能）
- 現着/撤収時刻は必須入力
- 時計アイコンで統一されたUI（lucide-react Clockアイコン）
- 行の複製機能（従業員コードは空でコピー）
- 現場作業時間をリアルタイム計算表示

**デフォルト値:**
- 出勤: 08:00
- 現着: 08:30
- 撤収: 16:00
- 退勤: 17:00
- 休憩: 60分

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
- 従事者: 配列（各エントリ: 従業員コード + 4時刻 + 休憩時間）
  - 従業員コード: 必須、10文字以内
  - 出勤時刻（clock_in）: 任意（途中合流の場合は空）
  - 現着時刻（site_arrival）: 必須
  - 撤収時刻（site_departure）: 必須
  - 退勤時刻（clock_out）: 任意（途中離脱の場合は空）
  - 休憩時間: 0以上の整数（デフォルト60分）

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
│ [期間選択: 単月/期間指定]                                   │
├──────────────────────────────────────────────────────────┤
│ [現場数] [案件数] [売上] [経費] [人件費]                     │
├──────────────────────────────────────────────────────────┤
│ [月別売上・経費推移グラフ]      │ [直近の案件リスト]         │
├──────────────────────────────────────────────────────────┤
│ [従業員稼働テーブル]                                       │
└──────────────────────────────────────────────────────────┘
```

#### 期間選択機能
- **単月モード**: 特定の月を選択（デフォルト: 今月）
- **期間指定モード**: 開始日〜終了日を指定して集計
- 選択した期間に応じてサマリーカード・従業員稼働テーブルが更新

#### API層（dashboardApi.ts）
- `getDashboardSummary(startDate?, endDate?)`: サマリー情報取得（現場数、案件数、期間内の売上/経費/人件費）
- `getMonthlyStats(months)`: 月別集計取得（過去N ヶ月分）
- `getRecentProjects(limit)`: 直近案件取得
- `getEmployeeWorkSummary(startDate?, endDate?)`: 期間内の従業員稼働サマリー取得

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

### Phase 7: 従業員マスタ・人件費自動計算（完了 ✅）

**実装内容:**
- 従業員マスタ管理（CRUD）
- 給与タイプ別の人件費計算（時給/日給月給/月給）
- 案件編集画面での「人件費を自動計算」ボタン
- 同日複数案件従事時の按分計算

**主要ファイル:**
- `src/pages/EmployeeListPage.tsx`: 従業員一覧・検索
- `src/pages/EmployeeFormPage.tsx`: 従業員作成・編集フォーム
- `src/components/EmployeeCard.tsx`: 従業員カード表示
- `src/lib/employeesApi.ts`: 従業員API（CRUD）
- `src/lib/laborCostApi.ts`: 人件費計算API
- `src/schemas/employeeSchema.ts`: Zodバリデーション

**機能詳細:**

#### 従業員一覧（EmployeeListPage）
- 全従業員を従業員コード順に表示
- 検索機能（従業員コード・氏名）
- 給与タイプ別バッジ表示（時給/日給月給/月給）

#### 従業員フォーム（EmployeeFormPage）
- 従業員コード（編集時は変更不可）
- 氏名
- 給与タイプ（RadioGroup: 時給/日給月給/月給）
- 時給（時給タイプの場合のみ表示）
- 日給（日給月給タイプの場合のみ表示）
- 月給（月給タイプの場合のみ表示）※会社負担分の社保料等を加算した金額を入力推奨

**削除方式:**
- 物理削除（履歴テーブル `employees_history` に自動退避）

#### 人件費計算ロジック（laborCostApi.ts）
- **時給の場合**: `時給 × (total_hours || site_hours)`
- **日給月給の場合**: `日給 × (その案件での稼働時間 / その日の全案件の稼働時間合計)`
- **月給の場合**: `(月給 ÷ 実稼働日数) × (その案件での稼働時間 / その日の全案件の稼働時間合計)`
  - 実稼働日数 = 営業日数 - 臨時休業日数（営業日数管理から取得）
  - 営業日数データがない月は計算をスキップ（0円）

**按分計算の例:**
従業員Aさん（日給: 15,000円）が1/15に2つの案件に従事:
- 案件X: 4時間拘束
- 案件Y: 4時間拘束
- 結果: 案件X = 7,500円、案件Y = 7,500円

**月給計算の例:**
従業員Bさん（月給: 300,000円）が1月（営業日数22日、臨時休業0日）に従事:
- 1日あたりの日給: 300,000 ÷ 22 = 13,636円
- 案件Xで4時間、案件Yで4時間従事 → 各案件6,818円

#### 案件編集画面の「人件費を自動計算」ボタン
- クリック時に`calculateLaborCost()`を呼び出し
- 計算結果をダイアログで表示（内訳・合計）
- 「反映する」ボタンで`labor_cost`フィールドに値をセット

---

### Phase 8: 月次経費管理・粗利計算（完了 ✅）

**実装内容:**
- 月次経費（固定費・変動費）の管理画面
- 定型カテゴリ選択 + その他（自由入力）
- 前月からコピー機能
- ダッシュボードに固定費・変動費・粗利表示を追加
- 月別グラフに固定費・変動費を追加

**主要ファイル:**
- `src/pages/MonthlyCostPage.tsx`: 月次経費管理ページ
- `src/lib/monthlyCostsApi.ts`: 月次経費API（CRUD + コピー）
- `src/schemas/monthlyCostSchema.ts`: Zodバリデーション
- `src/pages/DashboardPage.tsx`: 固定費・変動費・粗利表示追加
- `src/lib/dashboardApi.ts`: 月次経費集計機能追加
- `src/components/MonthlyChart.tsx`: 固定費・変動費をグラフに追加

**機能詳細:**

#### 月次経費ページ（MonthlyCostPage）
- 月選択ナビゲーション（前月・次月）
- 固定費セクション（合計金額表示）
- 変動費セクション（合計金額表示）
- 各項目の編集・削除機能
- 「新規登録」ダイアログ
  - 経費種別選択（固定費/変動費）
  - カテゴリ選択（定型 + その他自由入力）
  - 金額・備考入力
- 「前月からコピー」機能

#### 定型カテゴリ
- **固定費**: 地代家賃、水道光熱費、通信費、保険料、リース料、その他
- **変動費**: カード決済手数料、消耗品費、車両燃料費、その他

#### ダッシュボード更新
- サマリーカードに追加:
  - 固定費（紫色アイコン）
  - 変動費（オレンジ色アイコン）
  - 粗利（緑/赤のバリアント表示）
- 粗利計算: `売上 - 経費 - 人件費 - 固定費 - 変動費`
- 月別グラフに固定費・変動費を追加

#### API層（monthlyCostsApi.ts）
- `getMonthlyCostsByMonth(yearMonth)`: 月指定で取得
- `getMonthlyCostsByRange(startMonth, endMonth)`: 期間指定で取得
- `createMonthlyCost(cost)`: 作成
- `updateMonthlyCost(id, cost)`: 更新
- `deleteMonthlyCost(id)`: 削除
- `copyFromPreviousMonth(yearMonth)`: 前月からコピー
- `getMonthlyCostTotals(yearMonth)`: 固定費・変動費合計取得

---

### Phase 9: 履歴機能強化（完了 ✅）

**実装内容:**
- 全履歴テーブルにINSERTトリガーを追加（新規作成時も履歴に記録）
- 従業員コード重複禁止と履歴からの復元機能
- 履歴ページに従業員・月次経費タブを追加
- 分析ページの履歴タブを5つのサブタブに拡張

**主要ファイル:**
- `supabase/migrations/20260110000000_initial_schema.sql`: 全トリガー更新
- `src/pages/AnalysisPage.tsx`: 履歴タブ拡張
- `src/lib/historyApi.ts`: 従業員・月次経費履歴API追加
- `src/lib/employeesApi.ts`: 復元機能追加

**機能詳細:**

#### INSERT対応トリガー
全7テーブルの履歴トリガーがINSERT/UPDATE/DELETEに対応:
- `fields` → `fields_history`
- `projects` → `projects_history`
- `work_days` → `work_days_history`
- `work_records` → `work_records_history`
- `expenses` → `expenses_history`
- `employees` → `employees_history`
- `monthly_costs` → `monthly_costs_history`

**トリガー仕様:**
- AFTER INSERT OR UPDATE OR DELETE ON [table]
- SECURITY DEFINER（auth.uid()を正しく取得）
- operation_type: 'INSERT', 'UPDATE', 'DELETE', 'RESTORE'

#### 従業員コード重複禁止と復元機能
- 従業員コードはUNIQUE制約により重複不可
- 削除済み従業員のコードを再使用しようとするとエラー
- 履歴から削除済み従業員を復元する機能を追加
  - `restoreEmployee(employeeCode)`: 最新のDELETE履歴から復元
  - 復元時はoperation_type='RESTORE'で履歴に記録

#### 分析ページ履歴タブ
5つのサブタブで履歴を表示:
- 現場履歴
- 案件履歴
- 作業日履歴
- 従業員履歴（新規）
- 月次経費履歴（新規）

各履歴で操作種別バッジ（INSERT/UPDATE/DELETE/RESTORE）を表示

---

### Phase 10: 人件費計算の履歴ベース化（完了 ✅）

**実装内容:**
- 人件費計算時に作業日時点の従業員給与情報を使用
- 削除済み従業員の人件費も計算可能
- 給与変更後の過去案件再計算時も当時の給与で計算

**主要ファイル:**
- `src/lib/laborCostApi.ts`: 時点参照機能追加
- `supabase/migrations/20260110000000_initial_schema.sql`: インデックス追加

**機能詳細:**

#### 時点参照関数

**getEmployeeAtDate(employeeCode, workDate):**
指定日時点での従業員給与情報を取得

ロジック:
1. `employees_history`から、指定日以前で最新のINSERT/UPDATE/RESTOREレコードを検索
2. 見つかればその時点の給与情報を返す
3. なければ`employees`の現行データを返す（後方互換性）
4. 現行にもなければnull（削除済み従業員で履歴もない場合）

**getEmployeesAtDates(recordsWithDate):**
複数従業員の作業日ごとの給与情報を一括取得

#### 人件費計算の変更点
- 従来: `employees`テーブルから現在の給与情報を取得
- 変更後: `employees_history`から作業日時点の給与情報を取得

**メリット:**
- 従業員の給与変更後、過去の案件で人件費再計算しても当時の給与で計算
- 削除済み従業員の人件費も計算可能（履歴から給与情報を取得）
- 後方互換性あり（履歴がない従業員は現行テーブルから取得）

#### パフォーマンス最適化
人件費計算の時点参照用複合インデックスを追加:
```sql
CREATE INDEX idx_employees_history_code_operation
ON employees_history(employee_code, operation_at DESC);
```

---

### Phase 11: カスケード削除機能（完了 ✅）

**実装内容:**
- 現場削除時に関連データを一括で削除（履歴テーブルに自動退避）
- 削除前に関連データ件数を表示して確認
- 履歴表示での削除済み現場名の正しい表示

**主要ファイル:**
- `src/lib/fieldsApi.ts`: カスケード削除API追加
- `src/pages/FieldListPage.tsx`: 削除確認ダイアログ拡張
- `src/lib/historyApi.ts`: 削除済み現場名の取得処理追加

**機能詳細:**

#### 関連データカウント取得
`getFieldRelatedCounts(fieldId)`:
- 関連案件数
- 関連作業日数
- 関連従事者記録数
- 関連経費数

#### カスケード削除処理
`deleteFieldWithCascade(fieldId)`:
外部キー制約を考慮した順序で削除（各テーブルのトリガーにより履歴テーブルに自動退避）:
1. `work_records`（従事者稼働記録）
2. `work_days`（日別作業記録）
3. `expenses`（経費）
4. `projects`（案件）
5. `fields`（現場）

#### 削除確認ダイアログ
関連データがある場合、削除前に警告表示:
```
以下の関連データも一緒に削除されます:
・案件: 3件
・作業日: 8件
・従事者記録: 15件
・経費: 5件

この操作は取り消せません。
削除されたデータは履歴テーブルに保存されます。
```

#### 履歴表示の改善
削除された現場に紐づく案件履歴で、現場名が「不明」と表示される問題を修正:
- `fields`テーブルに存在しない場合、`fields_history`テーブルから現場情報を取得

### Phase 12: 営業日数管理・認証拡張・UX改善（完了 ✅）

**実装内容:**
- 営業日数管理機能（月給従業員の日給計算用）
- マジックリンクログイン（パスワード不要のメール認証）
- ページ状態の永続化（リロード・ブラウザ復帰時の状態維持）
- トースト通知の改善（中央上段表示・閉じるボタン追加）
- ダッシュボードグラフの改善（売上と積み上げ費用の2バー表示）

**主要ファイル:**
- `src/pages/BusinessDaysPage.tsx`: 営業日数管理ページ
- `src/lib/businessDaysApi.ts`: 営業日数API
- `src/schemas/businessDaySchema.ts`: バリデーションスキーマ
- `src/pages/LoginPage.tsx`: マジックリンクログイン追加
- `src/App.tsx`: ページ状態の永続化、トースト設定変更
- `src/components/MonthlyChart.tsx`: グラフ表示改善
- `supabase/migrations/20260110000000_initial_schema.sql`: business_daysテーブル追加
- `supabase/config.toml`: マジックリンク用リダイレクトURL設定

**機能詳細:**

#### 営業日数管理（BusinessDaysPage）
年度別の営業日数と臨時休業日数を管理。月給従業員の1日あたりの日給計算に使用。

**データモデル:**
- `business_days`テーブル: 年度・種別（営業日/臨時休業）・月別日数・備考
- `business_days_history`テーブル: 変更履歴の自動退避

**UI:**
- スプレッドシート風レイアウト（年度 × 月のマトリクス表示）
- 営業日数行・臨時休業行・実稼働日行（自動計算）
- 年計の自動表示
- 年度追加ダイアログ（前年度データのコピー機能）
- 一括保存（変更のある年度のみupsert）
- 年度削除（履歴テーブルに自動退避）

**バリデーション:**
- 各月の値は0以上かつその月の日数以下
- 年度: 2000〜2100年

#### マジックリンクログイン
パスワード不要でメールアドレスのみでログインできる機能。

**フロー:**
1. ログイン画面で「マジックリンクでログイン」をクリック
2. メールアドレスを入力して「ログインリンクを送信」
3. メールに届いたリンクをクリックしてログイン完了

**UI:**
- パスワードログイン画面の下部に切り替えリンク
- マジックリンク画面ではメールアドレスのみ入力
- 送信完了後は確認メッセージを表示

**技術:**
- Supabase Auth の `signInWithOtp` を使用
- `supabase/config.toml` の `site_url` でリダイレクト先を設定

#### ページ状態の永続化
リロードやブラウザフォーカス復帰時に、現在のページ状態を維持。

**問題:**
- リロード時に常にダッシュボードに戻される
- ブラウザが非アクティブから復帰した際にダッシュボードにリセットされる

**解決策:**
- `sessionStorage` でナビゲーション状態を永続化
- 保存対象: 現在のページ、選択中のID（現場・案件・作業日・経費・従業員）
- `onAuthStateChange` を修正し、`SIGNED_IN` イベント時のみダッシュボード遷移
- ログアウト時に sessionStorage をクリア
- タブを閉じると状態はリセット（sessionStorage の仕様）

#### トースト通知の改善
操作の邪魔にならないようトースト表示を改善。

**変更内容:**
- 表示位置: 右上 → 中央上段
- 閉じるボタン追加（ユーザーが任意でトーストを閉じられる）

**技術:**
- Sonner の `position="top-center"` と `closeButton` prop を使用

#### ダッシュボードグラフの改善
月別売上・経費グラフを改善し、粗利が視覚的に分かりやすく。

**変更前:** 5本の独立したバー（売上・経費・人件費・固定費・変動費）

**変更後:** 2本のバー
- 売上（緑）- 単独バー
- 総費用（積み上げバー）- 経費・人件費・固定費・変動費を色分けして積み上げ表示

**技術:**
- Recharts の `stackId` prop で費用バーを積み上げ表示

---

### Phase 13: NDJSONインポート・エクスポート機能（完了 ✅）

**実装内容:**
- 全データのJSON Lines形式（NDJSON）エクスポート
- NDJSONファイルからのインポート（復元モード/追加モード）
- インポート時のエラー処理選択（部分インポート/ロールバック）
- 別環境からのデータ移行対応（UUID再生成・外部キー自動置換）

**主要ファイル:**
- `src/pages/DataManagementPage.tsx`: データ管理ページ
- `src/lib/ndjsonApi.ts`: NDJSON操作API

**機能詳細:**

#### データ管理ページ（DataManagementPage）
ダッシュボードから「データ管理」ボタンでアクセス。

**エクスポート:**
- 全11テーブルのデータをNDJSON形式でダウンロード
- ファイル名: `niwalog_backup_YYYY-MM-DD.ndjson`
- 各行に `_table`（テーブル名）と `_version`（スキーマバージョン）を付与

**インポート:**
- `.ndjson`/`.jsonl`/`.json`ファイルを選択
- ファイル内容のプレビュー表示（テーブルごとの件数）
- インポートモード選択
- エラー処理選択
- インポート結果の詳細表示（追加/スキップ/エラー件数）

#### インポートモード

| モード | 説明 | ユースケース |
|--------|------|-------------|
| 復元モード | 同じIDでデータを復元。既存データはスキップ | バックアップからの復元 |
| 追加モード | 新しいUUIDを生成して追加。外部キーも自動置換 | 別環境からの移行 |

**追加モードの動作:**
1. 全レコードに新しいUUIDを生成（employees.employee_codeは除く）
2. 旧ID→新IDのマッピングを作成
3. 親テーブルから順にインポート
4. 子テーブルの外部キーを新IDに自動置換

#### エラー処理

| 処理 | 説明 | 処理方式 |
|------|------|---------|
| 部分インポート | エラーをスキップして継続。成功分は残る | 1件ずつ処理 |
| ロールバック | エラー時は全て取り消し。データ整合性を保証 | バルク処理 |

**ロールバック処理:**
- エラー発生時、挿入済みレコードを外部キー制約の逆順で削除
- 削除順序: monthly_revenue_allocations → expenses → work_records → work_days → projects → annual_contracts → fields → monthly_costs → business_days → employees → app_settings

#### NDJSON形式

```json
{"_table":"employees","_version":1,"employee_code":"f001","name":"山田太郎",...}
{"_table":"fields","_version":1,"id":"uuid-xxx","field_code":"KT-001",...}
{"_table":"projects","_version":1,"id":"uuid-yyy","field_id":"uuid-xxx",...}
```

**対象テーブル（インポート順序）:**
1. app_settings（独立・設定データ）
2. employees（独立）
3. business_days（独立）
4. monthly_costs（独立）
5. fields（独立）
6. annual_contracts（← fields）
7. projects（← fields, annual_contracts）
8. work_days（← projects）
9. work_records（← work_days）
10. expenses（← projects）
11. monthly_revenue_allocations（← annual_contracts）

#### API層（ndjsonApi.ts）
- `exportAllToNDJSON()`: 全データをNDJSON形式でエクスポート
- `importFromNDJSON(content, options)`: NDJSONファイルからインポート
- `downloadNDJSON(content, filename?)`: NDJSONをファイルとしてダウンロード
- `getRecordCounts(content)`: ファイル内のレコード件数をプレビュー

---

### Phase 14: 年間契約・月次収益按分機能（完了 ✅）

**実装内容:**
- 年間契約マスタ管理（CRUD）
- 月次収益按分計算（進行基準: 稼働時間ベース）
- 年度末精算機能
- 案件への年間契約紐付け
- ダッシュボードへの年間契約収益統合

**主要ファイル:**
- `src/pages/AnnualContractListPage.tsx`: 年間契約一覧
- `src/pages/AnnualContractFormPage.tsx`: 年間契約作成・編集フォーム
- `src/pages/AnnualContractDetailPage.tsx`: 年間契約詳細・月次配分表
- `src/lib/annualContractsApi.ts`: 年間契約API（CRUD + 月次収益計算）
- `src/pages/ProjectFormPage.tsx`: 契約タイプ選択UI追加
- `src/schemas/projectSchema.ts`: 案件スキーマに契約タイプ追加
- `src/lib/dashboardApi.ts`: 年間契約収益の統合

**機能詳細:**

#### 収益認識方式

| 種別 | 方式 | 適用例 |
|------|------|--------|
| standard（通常案件） | 完了基準: implementation_dateの月に一括計上 | 一般顧客の剪定、除草 |
| annual（年間契約） | 進行基準: 稼働時間比率で月次按分 | 公共事業、年間管理契約 |

#### 月次収益計算ロジック

```
月次認識収益 = (月の実稼働時間 / 年間予算時間) × 年間契約額
```

**累計ベース計算（端数処理）:**
1. 累計収益 = min(契約額, round(契約額 × 累計時間 / 予算時間))
2. 当月収益 = 累計収益 - 前月累計収益
3. 最終月は契約額との差額を自動調整

**予算超過時の扱い:**
- 累計収益は契約額を上限としてキャップ
- 超過時間は追加収益なし（進行基準的アプローチ）

#### 年間契約一覧（AnnualContractListPage）
- 全年間契約をカードで表示
- 年度フィルタ（すべて / 特定年度）
- 契約期間・契約金額・予算時間を表示
- 精算済み/未精算のバッジ表示
- 編集・削除ボタン
- ダッシュボードへの戻るボタン

#### 年間契約フォーム（AnnualContractFormPage）
- フォームセクション:
  - 基本情報（現場選択、契約名）
  - 契約期間（年度、開始日、終了日）
  - 金額情報（契約金額、予算時間）
  - 備考
- 現場選択時に契約名を自動生成（例: 2026年度年間管理）
- 年度・開始日・終了日の連動入力
- リアルタイムバリデーション

#### 年間契約詳細（AnnualContractDetailPage）
- 契約概要カード（契約期間、契約金額、予算時間、進捗率）
- 月次収益配分テーブル
  - 月、実稼働時間、累計時間、配分率、月次収益、累計収益、調整額、ステータス
- 「月次収益を再計算」ボタン
  - 契約期間内の全月の収益を再計算
  - 過去月の作業記録修正時に使用
- 「年度末精算」ボタン
  - 累計認識収益と契約額の差額を最終月に調整
  - 精算後は再計算不可

#### 案件フォームの契約タイプ選択
- 契約タイプ（通常案件/年間契約）のセレクトボックス
- 年間契約選択時は対象契約をドロップダウンから選択
- 精算済み契約は選択肢から除外（編集時は紐付け済みの契約のみ表示）
- Zodバリデーション（superRefine）: 年間契約タイプ選択時は契約ID必須

#### ダッシュボード統合
- 月別売上に年間契約の月次認識収益を合算
- サマリーカードの売上に年間契約収益を含む

#### API層（annualContractsApi.ts）
- `listAllAnnualContracts()`: 全年間契約取得
- `listAnnualContractsByYear(year)`: 年度指定で取得
- `listAnnualContractsByField(fieldId)`: 現場指定で取得
- `getAnnualContractById(id)`: 年間契約詳細取得
- `createAnnualContract(contract)`: 年間契約作成
- `updateAnnualContract(id, contract)`: 年間契約更新
- `deleteAnnualContract(id)`: 年間契約削除
- `getAnnualContractProgress(id)`: 月次配分データ付き進捗取得
- `recalculateFromMonth(contractId, fromMonth)`: 指定月以降の収益を再計算
- `settleAnnualContract(id)`: 年度末精算を実行

#### バリデーション（AnnualContractFormPage内）
- 現場ID: 必須
- 契約名: 必須
- 年度: 必須
- 開始日: 必須
- 終了日: 必須
- 契約金額: 必須、0以上の整数
- 予算時間: 必須、0より大きい

### Phase 15: 自動距離計算機能（完了 ✅）

**実装内容:**
- 現場住所から基準住所（会社・事務所）までの距離・時間を自動計算
- Nominatim（OpenStreetMap）でジオコーディング（日本語住所対応）
- OpenRouteServiceでルート計算
- 住所正規化（郵便番号削除、全角→半角変換）
- 段階的住所検索（詳細→市区町村レベルへフォールバック）
- 設定画面での基準住所管理

**主要ファイル:**
- `supabase/functions/calculate-distance/index.ts`: Edge Function（距離計算API）
- `src/lib/distanceApi.ts`: Edge Function呼び出しAPI
- `src/lib/settingsApi.ts`: 設定CRUD API
- `src/pages/SettingsPage.tsx`: 基準住所設定画面
- `src/pages/FieldFormPage.tsx`: 自動距離計算ボタン追加
- `src/schemas/settingsSchema.ts`: 設定バリデーション

**アーキテクチャ:**

```
[フロントエンド] → [Supabase Edge Function] → [Nominatim API] → [ORS Directions API]
                           ↑
                   ORS_API_KEY (secrets)
```

- APIキーはEdge Functions secretsに保存（クライアント非公開）
- ジオコーディング: Nominatim（日本語住所対応、無料）
- ルーティング: OpenRouteService（無料枠2,000リクエスト/日）

**機能詳細:**

#### 住所正規化処理
Edge Function内で住所を前処理:
1. 郵便番号削除（〒xxx-xxxx形式）
2. 全角数字→半角数字変換
3. 全角記号→半角変換（−→-, 　→スペース）

#### 段階的住所検索
Nominatimで住所が見つからない場合、段階的に簡略化:
1. 完全な住所で検索
2. 番地を削除して検索
3. 都道府県+市区町村のみで検索

#### 設定画面（SettingsPage）
- 基準住所入力（住所、緯度、経度）
- 緯度・経度は手動入力（Google Maps等で確認）
- app_settingsテーブルに保存

#### 現場フォームの自動距離計算ボタン
- 「移動費情報」セクションのヘッダーに配置
- 住所入力後にボタンをクリック
- 片道移動距離（km）と片道移動時間（分）を自動入力
- 計算中はローディング表示

#### API層

**distanceApi.ts:**
- `calculateDistanceFromBase(destinationAddress, baseLat, baseLng)`: Edge Function呼び出し

**settingsApi.ts:**
- `getBaseAddressSettings()`: 基準住所設定取得
- `saveBaseAddressSettings(address, lat, lng)`: 基準住所設定保存

#### Edge Function（calculate-distance）
- POST `/functions/v1/calculate-distance`
- リクエストボディ: `{ destinationAddress, baseLat, baseLng }`
- レスポンス: `{ distanceKm, durationMinutes, geocodedAddress }`
- エラー時は適切なエラーメッセージを返却

#### エラーハンドリング

| ケース | メッセージ |
|--------|-----------|
| 基準住所未設定 | 基準住所が設定されていません。設定画面から登録してください。 |
| 住所が見つからない | 住所が見つかりませんでした。正しい住所を入力してください。 |
| API利用制限 | API利用制限に達しました。しばらく待ってから再試行してください。 |
| APIキー無効 | APIキーが無効です。管理者に連絡してください。 |

#### ローカル開発時のセットアップ

1. OpenRouteServiceでAPIキーを取得（https://openrouteservice.org/）
2. `supabase/functions/.env.local`にAPIキーを設定:
   ```
   ORS_API_KEY=your-api-key-here
   ```
3. Supabaseローカル環境を起動（まだの場合）:
   ```bash
   npx supabase start
   ```
4. Edge Functionを起動:
   ```bash
   npx supabase functions serve --env-file supabase/functions/.env.local --no-verify-jwt
   ```

**重要:** フロントエンドの`VITE_SUPABASE_URL`がローカルのSupabase URL（`http://127.0.0.1:54621`）と一致していることを確認してください。本番URLになっていると404エラーが発生します。ポート番号は`npx supabase status`で確認できます。

#### 帰属表示
設定画面に以下の帰属表示を追加:
- OpenRouteService（ルーティングAPI）
- OpenStreetMap（地図データ）

---

## 未実装機能

### エクスポート機能拡張
- Excel形式エクスポート
- レポート印刷機能（PDF出力）

### 分析機能拡張
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

Supabase auth admin APIでテストユーザーを再作成してください:

```bash
# service_role keyを取得
SERVICE_ROLE_KEY=$(npx supabase status --output json | jq -r '.SERVICE_ROLE_KEY')

# テストユーザーを作成
curl -X POST 'http://127.0.0.1:54621/auth/v1/admin/users' \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testtest",
    "email_confirm": true
  }'
```

**注意:** auth.usersテーブルへの直接SQLインサートは使用しないでください（500エラーの原因になります）。

### ログイン時に500エラー

**原因:** auth.usersテーブルに直接SQLでユーザーを作成した場合に発生します。

auth serviceのログを確認:
```bash
docker logs supabase_auth_niwalog-app 2>&1 | tail -20
```

以下のようなエラーが出ている場合:
```
"error":"error finding user: sql: Scan error on column index 3, name \"confirmation_token\": converting NULL to string is unsupported"
```

**解決方法:**
1. DBをリセット: `npx supabase db reset`
2. Supabase auth admin APIでユーザーを再作成（上記「テストユーザー作成」参照）

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

### Edge Functionで401 Unauthorizedエラー

**原因:**
- フロントエンドでログインしていない
- Authorizationヘッダーが送信されていない
- ローカル開発時にJWT検証に失敗している

**解決方法:**
1. フロントエンドでログイン済みであることを確認
2. ブラウザの開発者ツールでAuthorizationヘッダーが送信されているか確認
3. Edge Functionを`--no-verify-jwt`フラグ付きで起動:
   ```bash
   npx supabase functions serve --env-file supabase/functions/.env.local --no-verify-jwt
   ```

### Edge Functionで404 Not Foundエラー

**原因1:** `VITE_SUPABASE_URL`が本番URLになっている

**解決方法:** `.env.local`でローカルURLを設定（ポート番号は`npx supabase status`で確認）:
```
VITE_SUPABASE_URL=http://127.0.0.1:54621
```

**原因2:** `supabase start`が起動していない

**解決方法:**
```bash
npx supabase start
```

### 自動距離計算で住所が見つからない

**原因:** 日本語住所のフォーマットが認識されない場合があります。

**対処法:**
1. 郵便番号を削除して試す
2. 番地を省略して「都道府県+市区町村」のみで試す
3. 全角数字を半角に変換

Edge Function内で自動正規化を行いますが、極端に特殊な住所フォーマットは認識できない場合があります。

### Tailwind CSS v4エラー

- Tailwind CSS 3.4.17にダウングレード済み
- `tailwind.config.js`でCSS変数設定済み

問題が発生した場合は、`package.json`でTailwind CSSのバージョンを確認してください。

### フォーム更新ボタンが反応しない

**症状:** 案件編集画面などで「更新」ボタンをクリックしても何も起きない（エラーも出ない）

**原因:** テストデータのUUIDがRFC 4122に準拠していない可能性があります。

**確認方法:**
1. ブラウザの開発者ツール（F12）を開く
2. フォームのonSubmitにconsole.logを追加して`errors`を確認
3. `field_id`などのUUIDフィールドで`invalid_format`エラーが出ている場合、UUIDが原因

**解決方法:**
1. テストデータを削除
2. `gen_random_uuid()`を使用してデータを再作成

```sql
-- 正しいUUIDでテストデータを作成
INSERT INTO fields (id, field_code, field_name, ...) VALUES
  (gen_random_uuid(), 'F001', 'テスト現場A', ...);
```

詳細は「6. サンプルデータ投入」の「テストデータのUUIDについて」を参照。

---

## Git管理

**リモートリポジトリ:** https://github.com/lietsee/niwalog-app

**ブランチ:** main

**コミット履歴（最新）:**
- 自動距離計算機能（Phase 15）
- NDJSONインポート/エクスポートで年間契約テーブルに対応
- 年間契約・月次収益按分機能を追加
- NDJSONインポートのUNIQUE制約チェックを追加
- NDJSONインポート・エクスポート機能

---

## ライセンス・作成者

- **ライセンス:** MIT
- **作成者:** Claude Code with lietsee
