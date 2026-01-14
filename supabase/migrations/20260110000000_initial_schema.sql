-- ============================================================================
-- 現場記録管理システム - Supabase Database Schema (履歴テーブル版)
-- ============================================================================
-- 作成日: 2026年1月10日
-- 更新日: 2026年1月10日
-- データベース: Supabase (PostgreSQL)
-- 用途: 造園・庭園管理業務における現場別・案件別の記録管理
-- 履歴管理: 論理削除ではなく、履歴テーブルに退避する方式
-- ============================================================================

-- ============================================================================
-- 1. fields（現場マスタ）
-- ============================================================================
-- 現場の基本情報・固定情報を管理。1現場につき1レコード。

CREATE TABLE fields (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本情報
  field_code VARCHAR(50) UNIQUE NOT NULL,  -- 現場コード（例: KT-0001, NG-0007）
  field_name VARCHAR(255) NOT NULL,        -- 現場名
  customer_name VARCHAR(255),              -- 顧客名
  address TEXT,                            -- 住所

  -- 現場環境
  has_electricity BOOLEAN DEFAULT false,   -- 電気使用可否
  has_water BOOLEAN DEFAULT false,         -- 水道利用可否
  has_toilet BOOLEAN DEFAULT false,        -- トイレ使用可否
  toilet_distance VARCHAR(100),            -- トイレまでの距離（例: 徒歩5分）

  -- 移動費
  travel_distance_km DECIMAL(10, 2),       -- 片道移動距離（km）
  travel_time_minutes INTEGER,             -- 片道移動時間（分）
  travel_cost INTEGER,                     -- 片道移動費（円）

  -- 備考・注意事項
  notes TEXT,                              -- 現場備考
  warnings TEXT,                           -- 注意事項（過去の失敗事例など）

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)  -- Supabase認証と連携
);

-- インデックス
CREATE INDEX idx_fields_code ON fields(field_code);
CREATE INDEX idx_fields_name ON fields(field_name);

-- コメント
COMMENT ON TABLE fields IS '現場マスタ: 現場の基本情報と環境情報を管理（アクティブなレコードのみ）';
COMMENT ON COLUMN fields.field_code IS '現場コード（例: KT-0001, NG-0007）';
COMMENT ON COLUMN fields.travel_cost IS 'ガソリン代・ETC等を含む片道移動費';

-- ============================================================================
-- 1-H. fields_history（現場マスタ履歴）
-- ============================================================================
-- 削除・更新された現場情報を履歴として保管

CREATE TABLE fields_history (
  -- 履歴ID
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 元のレコード情報（全カラムをコピー）
  id UUID NOT NULL,                        -- 元のfields.id
  field_code VARCHAR(50) NOT NULL,
  field_name VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  address TEXT,
  has_electricity BOOLEAN,
  has_water BOOLEAN,
  has_toilet BOOLEAN,
  toilet_distance VARCHAR(100),
  travel_distance_km DECIMAL(10, 2),
  travel_time_minutes INTEGER,
  travel_cost INTEGER,
  notes TEXT,
  warnings TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,

  -- 履歴管理情報
  operation_type VARCHAR(10) NOT NULL,     -- 'UPDATE' or 'DELETE'
  operation_at TIMESTAMPTZ DEFAULT NOW(),  -- 操作日時
  operation_by UUID REFERENCES auth.users(id), -- 操作者
  reason TEXT                              -- 削除・更新理由（任意）
);

-- インデックス
CREATE INDEX idx_fields_history_id ON fields_history(id);
CREATE INDEX idx_fields_history_code ON fields_history(field_code);
CREATE INDEX idx_fields_history_operation_at ON fields_history(operation_at DESC);

-- コメント
COMMENT ON TABLE fields_history IS '現場マスタ履歴: 削除・更新された現場情報を保管';
COMMENT ON COLUMN fields_history.operation_type IS '操作種別: UPDATE（更新前の状態）, DELETE（削除されたレコード）';

-- ============================================================================
-- 2. projects（案件）
-- ============================================================================
-- 1つの現場で複数回作業する場合、案件ごとに記録。1現場→複数案件の関係。

CREATE TABLE projects (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  field_id UUID NOT NULL REFERENCES fields(id) ON DELETE RESTRICT,  -- 履歴管理のためRESTRICT

  -- 案件情報
  project_number INTEGER NOT NULL,         -- 案件番号（現場内での連番: #1, #2, #3...）
  implementation_date DATE NOT NULL,       -- 実施日（開始日）

  -- 作業内容
  work_type_pruning BOOLEAN DEFAULT false, -- 剪定
  work_type_weeding BOOLEAN DEFAULT false, -- 除草
  work_type_cleaning BOOLEAN DEFAULT false,-- 清掃
  work_type_other VARCHAR(255),            -- その他（自由記述）

  -- 金額
  estimate_amount INTEGER,                 -- 見積もり金額（NULL可: 例年作業の場合）
  invoice_amount INTEGER,                  -- 請求金額（NULL可: 案件登録時点で未定の場合）

  -- 収支計算用（集計値、または手動入力）
  labor_cost INTEGER,                      -- 人件費（自動計算または手動）
  expense_total INTEGER,                   -- 経費合計（expensesテーブルから集計）

  -- 振り返り
  review_good_points TEXT,                 -- うまくいった点
  review_improvements TEXT,                -- 改善すべき点
  review_next_actions TEXT,                -- 次回への申し送り

  -- 年間契約関連
  contract_type VARCHAR(20) DEFAULT 'standard'
    CHECK (contract_type IN ('standard', 'annual')),  -- 契約タイプ
  annual_contract_id UUID,                 -- 年間契約への紐付け（後で外部キー制約追加）

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- 複合ユニーク制約（1つの現場で案件番号が重複しないように）
  UNIQUE(field_id, project_number),

  -- 契約タイプと年間契約IDの整合性チェック
  CHECK (contract_type <> 'annual' OR annual_contract_id IS NOT NULL)
);

-- インデックス
CREATE INDEX idx_projects_field ON projects(field_id);
CREATE INDEX idx_projects_date ON projects(implementation_date DESC);
CREATE INDEX idx_projects_field_date ON projects(field_id, implementation_date DESC);
CREATE INDEX idx_projects_contract_type ON projects(contract_type);
CREATE INDEX idx_projects_annual_contract ON projects(annual_contract_id);

-- コメント
COMMENT ON TABLE projects IS '案件: 1つの現場で複数回実施する作業を案件として管理';
COMMENT ON COLUMN projects.project_number IS '現場内での案件番号（#1, #2, #3...）';
COMMENT ON COLUMN projects.estimate_amount IS '見積もり金額（例年作業の場合はNULL）';
COMMENT ON COLUMN projects.contract_type IS '契約タイプ: standard=通常案件, annual=年間契約案件';
COMMENT ON COLUMN projects.annual_contract_id IS '年間契約への紐付け（contract_type=annualの場合に使用）';

-- ============================================================================
-- 2-H. projects_history（案件履歴）
-- ============================================================================

CREATE TABLE projects_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 元のレコード情報
  id UUID NOT NULL,
  field_id UUID NOT NULL,
  project_number INTEGER NOT NULL,
  implementation_date DATE NOT NULL,
  work_type_pruning BOOLEAN,
  work_type_weeding BOOLEAN,
  work_type_cleaning BOOLEAN,
  work_type_other VARCHAR(255),
  estimate_amount INTEGER,
  invoice_amount INTEGER,
  labor_cost INTEGER,
  expense_total INTEGER,
  review_good_points TEXT,
  review_improvements TEXT,
  review_next_actions TEXT,
  contract_type VARCHAR(20),                 -- 契約タイプ
  annual_contract_id UUID,                   -- 年間契約ID
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,

  -- 履歴管理情報
  operation_type VARCHAR(10) NOT NULL,
  operation_at TIMESTAMPTZ DEFAULT NOW(),
  operation_by UUID REFERENCES auth.users(id),
  reason TEXT
);

CREATE INDEX idx_projects_history_id ON projects_history(id);
CREATE INDEX idx_projects_history_field ON projects_history(field_id);
CREATE INDEX idx_projects_history_operation_at ON projects_history(operation_at DESC);

COMMENT ON TABLE projects_history IS '案件履歴: 削除・更新された案件情報を保管';

-- ============================================================================
-- 3. work_days（日別作業記録）
-- ============================================================================
-- 案件を複数日に分けて作業する場合の日別記録。1案件→複数日の関係。

CREATE TABLE work_days (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,

  -- 日付情報
  work_date DATE NOT NULL,                 -- 作業日
  day_number INTEGER NOT NULL,             -- 作業日の連番（1日目、2日目...）

  -- 天候情報（JSONB配列で時刻ごとの変化を記録）
  weather JSONB,                           -- 例: [{"time": "08:00", "condition": "晴れ,強風"}, {"time": "16:00", "condition": "雨"}]

  -- 作業内容・特記事項
  work_description TEXT,                   -- 作業内容の詳細
  troubles TEXT,                           -- トラブル・特記事項

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 複合ユニーク制約
  UNIQUE(project_id, day_number)
);

-- インデックス
CREATE INDEX idx_work_days_project ON work_days(project_id);
CREATE INDEX idx_work_days_date ON work_days(work_date DESC);

-- コメント
COMMENT ON TABLE work_days IS '日別作業記録: 1つの案件を複数日に分けて作業する場合の日別記録';
COMMENT ON COLUMN work_days.weather IS 'JSONB配列で時刻ごとの天候を記録';

-- ============================================================================
-- 3-H. work_days_history（日別作業記録履歴）
-- ============================================================================

CREATE TABLE work_days_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 元のレコード情報
  id UUID NOT NULL,
  project_id UUID NOT NULL,
  work_date DATE NOT NULL,
  day_number INTEGER NOT NULL,
  weather JSONB,
  work_description TEXT,
  troubles TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  -- 履歴管理情報
  operation_type VARCHAR(10) NOT NULL,
  operation_at TIMESTAMPTZ DEFAULT NOW(),
  operation_by UUID REFERENCES auth.users(id),
  reason TEXT
);

CREATE INDEX idx_work_days_history_id ON work_days_history(id);
CREATE INDEX idx_work_days_history_project ON work_days_history(project_id);
CREATE INDEX idx_work_days_history_operation_at ON work_days_history(operation_at DESC);

COMMENT ON TABLE work_days_history IS '日別作業記録履歴: 削除・更新された作業日情報を保管';

-- ============================================================================
-- 4. work_records（従事者稼働記録）
-- ============================================================================
-- 日別・従業員別の稼働時間を記録。
-- 4つの打刻時刻で途中合流・途中離脱パターンに対応。

CREATE TABLE work_records (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  work_day_id UUID NOT NULL REFERENCES work_days(id) ON DELETE RESTRICT,
  employee_code VARCHAR(10) NOT NULL,      -- 従業員番号（例: f001, f002, p002）

  -- 4つの打刻時刻（途中合流/途中離脱対応）
  clock_in TIME,                           -- 出勤時間（土場）※途中合流の場合はNULL
  site_arrival TIME NOT NULL,              -- 現場到着時間
  site_departure TIME NOT NULL,            -- 現場撤収時間
  clock_out TIME,                          -- 退勤時間（土場）※途中離脱の場合はNULL
  break_minutes INTEGER DEFAULT 60,        -- 休憩時間（分）、デフォルト60分

  -- 自動計算カラム
  site_hours DECIMAL(5, 2),                -- 現場作業時間（撤収-到着-休憩）
  prep_hours DECIMAL(5, 2),                -- 準備＋移動時間（到着-出勤）
  return_hours DECIMAL(5, 2),              -- 帰社時間（退勤-撤収）
  total_hours DECIMAL(5, 2),               -- 総拘束時間（退勤-出勤）

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_work_records_day ON work_records(work_day_id);
CREATE INDEX idx_work_records_employee ON work_records(employee_code);
CREATE INDEX idx_work_records_employee_day ON work_records(employee_code, work_day_id);

-- コメント
COMMENT ON TABLE work_records IS '従事者稼働記録: 日別・従業員別の稼働時間を記録（4時刻対応）';
COMMENT ON COLUMN work_records.employee_code IS '従業員番号（既存のSupabase DBの従業員マスタと連携予定）';
COMMENT ON COLUMN work_records.clock_in IS '出勤時間（土場）。途中合流の場合はNULL';
COMMENT ON COLUMN work_records.site_arrival IS '現場到着時間（必須）';
COMMENT ON COLUMN work_records.site_departure IS '現場撤収時間（必須）';
COMMENT ON COLUMN work_records.clock_out IS '退勤時間（土場）。途中離脱の場合はNULL';
COMMENT ON COLUMN work_records.site_hours IS '現場作業時間=撤収-到着-休憩（自動計算）';
COMMENT ON COLUMN work_records.prep_hours IS '準備＋移動時間=到着-出勤（自動計算、出勤がある場合のみ）';
COMMENT ON COLUMN work_records.return_hours IS '帰社時間=退勤-撤収（自動計算、退勤がある場合のみ）';
COMMENT ON COLUMN work_records.total_hours IS '総拘束時間=退勤-出勤（自動計算、両方ある場合のみ）';

-- ============================================================================
-- 4-H. work_records_history（従事者稼働記録履歴）
-- ============================================================================

CREATE TABLE work_records_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 元のレコード情報
  id UUID NOT NULL,
  work_day_id UUID NOT NULL,
  employee_code VARCHAR(10) NOT NULL,
  clock_in TIME,                           -- 出勤時間
  site_arrival TIME NOT NULL,              -- 現場到着時間
  site_departure TIME NOT NULL,            -- 現場撤収時間
  clock_out TIME,                          -- 退勤時間
  break_minutes INTEGER,
  site_hours DECIMAL(5, 2),                -- 現場作業時間
  prep_hours DECIMAL(5, 2),                -- 準備＋移動時間
  return_hours DECIMAL(5, 2),              -- 帰社時間
  total_hours DECIMAL(5, 2),               -- 総拘束時間
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  -- 履歴管理情報
  operation_type VARCHAR(10) NOT NULL,
  operation_at TIMESTAMPTZ DEFAULT NOW(),
  operation_by UUID REFERENCES auth.users(id),
  reason TEXT
);

CREATE INDEX idx_work_records_history_id ON work_records_history(id);
CREATE INDEX idx_work_records_history_day ON work_records_history(work_day_id);
CREATE INDEX idx_work_records_history_employee ON work_records_history(employee_code);
CREATE INDEX idx_work_records_history_operation_at ON work_records_history(operation_at DESC);

COMMENT ON TABLE work_records_history IS '従事者稼働記録履歴: 削除・更新された稼働記録を保管（4時刻対応）';

-- ============================================================================
-- 5. expenses（経費）
-- ============================================================================
-- 案件固有の経費（クレーン、消耗品、外注など）を記録。

CREATE TABLE expenses (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,

  -- 経費情報
  expense_item VARCHAR(255) NOT NULL,      -- 項目（例: ラフタークレーン（1日））
  amount INTEGER NOT NULL,                 -- 金額（円）
  notes TEXT,                              -- 備考
  expense_date DATE,                       -- 使用日（work_days.work_dateと紐付け可能）

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_expenses_project ON expenses(project_id);

-- コメント
COMMENT ON TABLE expenses IS '経費: 案件固有でかかった経費（クレーン、消耗品、外注など）';
COMMENT ON COLUMN expenses.expense_date IS '経費が発生した日（work_daysと紐付け可能）';

-- ============================================================================
-- 5-H. expenses_history（経費履歴）
-- ============================================================================

CREATE TABLE expenses_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 元のレコード情報
  id UUID NOT NULL,
  project_id UUID NOT NULL,
  expense_item VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  notes TEXT,
  expense_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  -- 履歴管理情報
  operation_type VARCHAR(10) NOT NULL,
  operation_at TIMESTAMPTZ DEFAULT NOW(),
  operation_by UUID REFERENCES auth.users(id),
  reason TEXT
);

CREATE INDEX idx_expenses_history_id ON expenses_history(id);
CREATE INDEX idx_expenses_history_project ON expenses_history(project_id);
CREATE INDEX idx_expenses_history_operation_at ON expenses_history(operation_at DESC);

COMMENT ON TABLE expenses_history IS '経費履歴: 削除・更新された経費情報を保管';

-- ============================================================================
-- トリガー関数
-- ============================================================================

-- ============================================================================
-- A. 稼働時間を自動計算するトリガー関数（4時刻対応）
-- ============================================================================
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

  -- 総拘束時間（両方ある場合のみ）= 退勤 - 出勤 - 休憩
  IF NEW.clock_in IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
    NEW.total_hours := (EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600)
                       - (COALESCE(NEW.break_minutes, 60) / 60.0);
  ELSE
    NEW.total_hours := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_working_hours
BEFORE INSERT OR UPDATE ON work_records
FOR EACH ROW
EXECUTE FUNCTION calculate_working_hours();

-- ============================================================================
-- B. updated_atを自動更新するトリガー関数
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにupdated_at更新トリガーを設定
CREATE TRIGGER trg_fields_updated_at
BEFORE UPDATE ON fields
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_work_days_updated_at
BEFORE UPDATE ON work_days
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_work_records_updated_at
BEFORE UPDATE ON work_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- C. 履歴テーブルへの自動退避トリガー関数
-- ============================================================================

-- fields用
CREATE OR REPLACE FUNCTION archive_fields_to_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO fields_history (
      id, field_code, field_name, customer_name, address,
      has_electricity, has_water, has_toilet, toilet_distance,
      travel_distance_km, travel_time_minutes, travel_cost,
      notes, warnings, created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      NEW.id, NEW.field_code, NEW.field_name, NEW.customer_name, NEW.address,
      NEW.has_electricity, NEW.has_water, NEW.has_toilet, NEW.toilet_distance,
      NEW.travel_distance_km, NEW.travel_time_minutes, NEW.travel_cost,
      NEW.notes, NEW.warnings, NEW.created_at, NEW.updated_at, NEW.created_by,
      'INSERT', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO fields_history (
      id, field_code, field_name, customer_name, address,
      has_electricity, has_water, has_toilet, toilet_distance,
      travel_distance_km, travel_time_minutes, travel_cost,
      notes, warnings, created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.field_code, OLD.field_name, OLD.customer_name, OLD.address,
      OLD.has_electricity, OLD.has_water, OLD.has_toilet, OLD.toilet_distance,
      OLD.travel_distance_km, OLD.travel_time_minutes, OLD.travel_cost,
      OLD.notes, OLD.warnings, OLD.created_at, OLD.updated_at, OLD.created_by,
      'UPDATE', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO fields_history (
      id, field_code, field_name, customer_name, address,
      has_electricity, has_water, has_toilet, toilet_distance,
      travel_distance_km, travel_time_minutes, travel_cost,
      notes, warnings, created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.field_code, OLD.field_name, OLD.customer_name, OLD.address,
      OLD.has_electricity, OLD.has_water, OLD.has_toilet, OLD.toilet_distance,
      OLD.travel_distance_km, OLD.travel_time_minutes, OLD.travel_cost,
      OLD.notes, OLD.warnings, OLD.created_at, OLD.updated_at, OLD.created_by,
      'DELETE', auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_archive_fields
AFTER INSERT OR UPDATE OR DELETE ON fields
FOR EACH ROW
EXECUTE FUNCTION archive_fields_to_history();

-- projects用
CREATE OR REPLACE FUNCTION archive_projects_to_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO projects_history (
      id, field_id, project_number, implementation_date,
      work_type_pruning, work_type_weeding, work_type_cleaning, work_type_other,
      estimate_amount, invoice_amount, labor_cost, expense_total,
      review_good_points, review_improvements, review_next_actions,
      contract_type, annual_contract_id,
      created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      NEW.id, NEW.field_id, NEW.project_number, NEW.implementation_date,
      NEW.work_type_pruning, NEW.work_type_weeding, NEW.work_type_cleaning, NEW.work_type_other,
      NEW.estimate_amount, NEW.invoice_amount, NEW.labor_cost, NEW.expense_total,
      NEW.review_good_points, NEW.review_improvements, NEW.review_next_actions,
      NEW.contract_type, NEW.annual_contract_id,
      NEW.created_at, NEW.updated_at, NEW.created_by,
      'INSERT', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO projects_history (
      id, field_id, project_number, implementation_date,
      work_type_pruning, work_type_weeding, work_type_cleaning, work_type_other,
      estimate_amount, invoice_amount, labor_cost, expense_total,
      review_good_points, review_improvements, review_next_actions,
      contract_type, annual_contract_id,
      created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.field_id, OLD.project_number, OLD.implementation_date,
      OLD.work_type_pruning, OLD.work_type_weeding, OLD.work_type_cleaning, OLD.work_type_other,
      OLD.estimate_amount, OLD.invoice_amount, OLD.labor_cost, OLD.expense_total,
      OLD.review_good_points, OLD.review_improvements, OLD.review_next_actions,
      OLD.contract_type, OLD.annual_contract_id,
      OLD.created_at, OLD.updated_at, OLD.created_by,
      'UPDATE', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO projects_history (
      id, field_id, project_number, implementation_date,
      work_type_pruning, work_type_weeding, work_type_cleaning, work_type_other,
      estimate_amount, invoice_amount, labor_cost, expense_total,
      review_good_points, review_improvements, review_next_actions,
      contract_type, annual_contract_id,
      created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.field_id, OLD.project_number, OLD.implementation_date,
      OLD.work_type_pruning, OLD.work_type_weeding, OLD.work_type_cleaning, OLD.work_type_other,
      OLD.estimate_amount, OLD.invoice_amount, OLD.labor_cost, OLD.expense_total,
      OLD.review_good_points, OLD.review_improvements, OLD.review_next_actions,
      OLD.contract_type, OLD.annual_contract_id,
      OLD.created_at, OLD.updated_at, OLD.created_by,
      'DELETE', auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_archive_projects
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION archive_projects_to_history();

-- work_days用
CREATE OR REPLACE FUNCTION archive_work_days_to_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO work_days_history (
      id, project_id, work_date, day_number, weather,
      work_description, troubles, created_at, updated_at,
      operation_type, operation_by
    ) VALUES (
      NEW.id, NEW.project_id, NEW.work_date, NEW.day_number, NEW.weather,
      NEW.work_description, NEW.troubles, NEW.created_at, NEW.updated_at,
      'INSERT', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO work_days_history (
      id, project_id, work_date, day_number, weather,
      work_description, troubles, created_at, updated_at,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.project_id, OLD.work_date, OLD.day_number, OLD.weather,
      OLD.work_description, OLD.troubles, OLD.created_at, OLD.updated_at,
      'UPDATE', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO work_days_history (
      id, project_id, work_date, day_number, weather,
      work_description, troubles, created_at, updated_at,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.project_id, OLD.work_date, OLD.day_number, OLD.weather,
      OLD.work_description, OLD.troubles, OLD.created_at, OLD.updated_at,
      'DELETE', auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_archive_work_days
AFTER INSERT OR UPDATE OR DELETE ON work_days
FOR EACH ROW
EXECUTE FUNCTION archive_work_days_to_history();

-- work_records用（4時刻対応）
CREATE OR REPLACE FUNCTION archive_work_records_to_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO work_records_history (
      id, work_day_id, employee_code,
      clock_in, site_arrival, site_departure, clock_out,
      break_minutes, site_hours, prep_hours, return_hours, total_hours,
      created_at, updated_at,
      operation_type, operation_by
    ) VALUES (
      NEW.id, NEW.work_day_id, NEW.employee_code,
      NEW.clock_in, NEW.site_arrival, NEW.site_departure, NEW.clock_out,
      NEW.break_minutes, NEW.site_hours, NEW.prep_hours, NEW.return_hours, NEW.total_hours,
      NEW.created_at, NEW.updated_at,
      'INSERT', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO work_records_history (
      id, work_day_id, employee_code,
      clock_in, site_arrival, site_departure, clock_out,
      break_minutes, site_hours, prep_hours, return_hours, total_hours,
      created_at, updated_at,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.work_day_id, OLD.employee_code,
      OLD.clock_in, OLD.site_arrival, OLD.site_departure, OLD.clock_out,
      OLD.break_minutes, OLD.site_hours, OLD.prep_hours, OLD.return_hours, OLD.total_hours,
      OLD.created_at, OLD.updated_at,
      'UPDATE', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO work_records_history (
      id, work_day_id, employee_code,
      clock_in, site_arrival, site_departure, clock_out,
      break_minutes, site_hours, prep_hours, return_hours, total_hours,
      created_at, updated_at,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.work_day_id, OLD.employee_code,
      OLD.clock_in, OLD.site_arrival, OLD.site_departure, OLD.clock_out,
      OLD.break_minutes, OLD.site_hours, OLD.prep_hours, OLD.return_hours, OLD.total_hours,
      OLD.created_at, OLD.updated_at,
      'DELETE', auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_archive_work_records
AFTER INSERT OR UPDATE OR DELETE ON work_records
FOR EACH ROW
EXECUTE FUNCTION archive_work_records_to_history();

-- expenses用
CREATE OR REPLACE FUNCTION archive_expenses_to_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO expenses_history (
      id, project_id, expense_item, amount, notes, expense_date,
      created_at, updated_at,
      operation_type, operation_by
    ) VALUES (
      NEW.id, NEW.project_id, NEW.expense_item, NEW.amount, NEW.notes, NEW.expense_date,
      NEW.created_at, NEW.updated_at,
      'INSERT', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO expenses_history (
      id, project_id, expense_item, amount, notes, expense_date,
      created_at, updated_at,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.project_id, OLD.expense_item, OLD.amount, OLD.notes, OLD.expense_date,
      OLD.created_at, OLD.updated_at,
      'UPDATE', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO expenses_history (
      id, project_id, expense_item, amount, notes, expense_date,
      created_at, updated_at,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.project_id, OLD.expense_item, OLD.amount, OLD.notes, OLD.expense_date,
      OLD.created_at, OLD.updated_at,
      'DELETE', auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_archive_expenses
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW
EXECUTE FUNCTION archive_expenses_to_history();

-- ============================================================================
-- Row Level Security (RLS) ポリシー
-- ============================================================================

-- fieldsテーブルのRLS有効化
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが現場を閲覧可能
CREATE POLICY "Users can view all fields"
ON fields FOR SELECT
USING (true);

-- 認証済みユーザーが現場を登録可能
CREATE POLICY "Users can insert their own fields"
ON fields FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- 認証済みユーザーが現場を更新可能
CREATE POLICY "Authenticated users can update fields"
ON fields FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 認証済みユーザーが現場を削除可能
CREATE POLICY "Authenticated users can delete fields"
ON fields FOR DELETE
USING (auth.role() = 'authenticated');

-- projectsテーブルのRLS有効化
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが案件を閲覧可能
CREATE POLICY "Users can view all projects"
ON projects FOR SELECT
USING (true);

-- 認証済みユーザーが案件を登録可能
CREATE POLICY "Users can insert projects"
ON projects FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- 認証済みユーザーが案件を更新可能
CREATE POLICY "Authenticated users can update projects"
ON projects FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 認証済みユーザーが案件を削除可能
CREATE POLICY "Authenticated users can delete projects"
ON projects FOR DELETE
USING (auth.role() = 'authenticated');

-- work_days, work_records, expensesテーブルのRLS
-- （簡略版: 認証済みユーザーは全操作可能）
ALTER TABLE work_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage work_days" ON work_days FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage work_records" ON work_records FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage expenses" ON expenses FOR ALL USING (auth.role() = 'authenticated');

-- 履歴テーブルのRLS（閲覧のみ許可、編集・削除は不可）
ALTER TABLE fields_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view fields history" ON fields_history FOR SELECT USING (true);
CREATE POLICY "System can archive fields history" ON fields_history FOR INSERT WITH CHECK (true);

ALTER TABLE projects_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view projects history" ON projects_history FOR SELECT USING (true);
CREATE POLICY "System can archive projects history" ON projects_history FOR INSERT WITH CHECK (true);

ALTER TABLE work_days_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view work_days history" ON work_days_history FOR SELECT USING (true);
CREATE POLICY "System can archive work_days history" ON work_days_history FOR INSERT WITH CHECK (true);

ALTER TABLE work_records_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view work_records history" ON work_records_history FOR SELECT USING (true);
CREATE POLICY "System can archive work_records history" ON work_records_history FOR INSERT WITH CHECK (true);

ALTER TABLE expenses_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view expenses history" ON expenses_history FOR SELECT USING (true);
CREATE POLICY "System can archive expenses history" ON expenses_history FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 従業員マスタ
-- ============================================================================

-- employees（従業員マスタ）
-- 履歴テーブル方式で管理（is_activeは使用しない）
CREATE TABLE employees (
  employee_code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  salary_type VARCHAR(10) NOT NULL CHECK (salary_type IN ('hourly', 'daily', 'monthly')),
  hourly_rate INTEGER,
  daily_rate INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE employees IS '従業員マスタ: 従業員情報と給与タイプ・単価を管理（アクティブなレコードのみ）';
COMMENT ON COLUMN employees.employee_code IS '従業員コード（主キー）';
COMMENT ON COLUMN employees.name IS '従業員氏名';
COMMENT ON COLUMN employees.salary_type IS '給与タイプ: hourly=時給, daily=日給月給, monthly=月給';
COMMENT ON COLUMN employees.hourly_rate IS '時給（円）- salary_type=hourly の場合に使用';
COMMENT ON COLUMN employees.daily_rate IS '日給（円）- salary_type=daily/monthly の場合に使用';

-- インデックス
CREATE INDEX idx_employees_salary_type ON employees(salary_type);

-- RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage employees" ON employees FOR ALL USING (auth.role() = 'authenticated');

-- updated_at自動更新トリガー
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6-H. employees_history（従業員マスタ履歴）
-- ============================================================================

CREATE TABLE employees_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 元のレコード情報
  employee_code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  salary_type VARCHAR(10) NOT NULL,
  hourly_rate INTEGER,
  daily_rate INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,

  -- 履歴管理情報
  operation_type VARCHAR(10) NOT NULL,     -- 'UPDATE' or 'DELETE'
  operation_at TIMESTAMPTZ DEFAULT NOW(),  -- 操作日時
  operation_by UUID REFERENCES auth.users(id), -- 操作者
  reason TEXT                              -- 削除・更新理由（任意）
);

-- インデックス
CREATE INDEX idx_employees_history_code ON employees_history(employee_code);
CREATE INDEX idx_employees_history_operation_at ON employees_history(operation_at DESC);
-- 人件費計算の時点参照用インデックス（employee_code + operation_at の複合インデックス）
CREATE INDEX idx_employees_history_code_operation ON employees_history(employee_code, operation_at DESC);

-- コメント
COMMENT ON TABLE employees_history IS '従業員マスタ履歴: 削除・更新・新規作成された従業員情報を保管';
COMMENT ON COLUMN employees_history.operation_type IS '操作種別: INSERT（新規作成）, UPDATE（更新前の状態）, DELETE（削除されたレコード）, RESTORE（復元）';

-- RLS
ALTER TABLE employees_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view employees history" ON employees_history FOR SELECT USING (true);
CREATE POLICY "System can archive employees history" ON employees_history FOR INSERT WITH CHECK (true);

-- 履歴テーブルへの自動退避トリガー
CREATE OR REPLACE FUNCTION archive_employees_to_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO employees_history (
      employee_code, name, salary_type, hourly_rate, daily_rate,
      created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      NEW.employee_code, NEW.name, NEW.salary_type, NEW.hourly_rate, NEW.daily_rate,
      NEW.created_at, NEW.updated_at, NEW.created_by,
      'INSERT', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO employees_history (
      employee_code, name, salary_type, hourly_rate, daily_rate,
      created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      OLD.employee_code, OLD.name, OLD.salary_type, OLD.hourly_rate, OLD.daily_rate,
      OLD.created_at, OLD.updated_at, OLD.created_by,
      'UPDATE', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO employees_history (
      employee_code, name, salary_type, hourly_rate, daily_rate,
      created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      OLD.employee_code, OLD.name, OLD.salary_type, OLD.hourly_rate, OLD.daily_rate,
      OLD.created_at, OLD.updated_at, OLD.created_by,
      'DELETE', auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_archive_employees
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW
EXECUTE FUNCTION archive_employees_to_history();

-- ============================================================================
-- 7. monthly_costs（月次経費）
-- ============================================================================
-- 月ごとの固定費（地代家賃など）や変動費（カード決済費用など）を管理

CREATE TABLE monthly_costs (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 対象年月
  year_month VARCHAR(7) NOT NULL,          -- 対象年月（例: 2026-01）

  -- 経費情報
  cost_type VARCHAR(20) NOT NULL CHECK (cost_type IN ('fixed', 'variable')),  -- 種別: fixed=固定費, variable=変動費
  category VARCHAR(100) NOT NULL,          -- カテゴリ（例: 地代家賃、通信費）
  amount INTEGER NOT NULL,                 -- 金額（円）
  notes TEXT,                              -- 備考

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- インデックス
CREATE INDEX idx_monthly_costs_year_month ON monthly_costs(year_month);
CREATE INDEX idx_monthly_costs_type ON monthly_costs(cost_type);
CREATE INDEX idx_monthly_costs_year_month_type ON monthly_costs(year_month, cost_type);

-- コメント
COMMENT ON TABLE monthly_costs IS '月次経費: 月ごとの固定費・変動費を管理';
COMMENT ON COLUMN monthly_costs.year_month IS '対象年月（例: 2026-01）';
COMMENT ON COLUMN monthly_costs.cost_type IS '経費種別: fixed=固定費, variable=変動費';
COMMENT ON COLUMN monthly_costs.category IS 'カテゴリ（例: 地代家賃、通信費、カード決済手数料）';
COMMENT ON COLUMN monthly_costs.amount IS '金額（円）';

-- RLS
ALTER TABLE monthly_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage monthly_costs" ON monthly_costs FOR ALL USING (auth.role() = 'authenticated');

-- updated_at自動更新トリガー
CREATE TRIGGER update_monthly_costs_updated_at
BEFORE UPDATE ON monthly_costs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7-H. monthly_costs_history（月次経費履歴）
-- ============================================================================

CREATE TABLE monthly_costs_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 元のレコード情報
  id UUID NOT NULL,
  year_month VARCHAR(7) NOT NULL,
  cost_type VARCHAR(20) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,

  -- 履歴管理情報
  operation_type VARCHAR(10) NOT NULL,     -- 'UPDATE' or 'DELETE'
  operation_at TIMESTAMPTZ DEFAULT NOW(),  -- 操作日時
  operation_by UUID REFERENCES auth.users(id), -- 操作者
  reason TEXT                              -- 削除・更新理由（任意）
);

-- インデックス
CREATE INDEX idx_monthly_costs_history_id ON monthly_costs_history(id);
CREATE INDEX idx_monthly_costs_history_year_month ON monthly_costs_history(year_month);
CREATE INDEX idx_monthly_costs_history_operation_at ON monthly_costs_history(operation_at DESC);

-- コメント
COMMENT ON TABLE monthly_costs_history IS '月次経費履歴: 削除・更新された月次経費情報を保管';
COMMENT ON COLUMN monthly_costs_history.operation_type IS '操作種別: UPDATE（更新前の状態）, DELETE（削除されたレコード）';

-- RLS
ALTER TABLE monthly_costs_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view monthly_costs history" ON monthly_costs_history FOR SELECT USING (true);
CREATE POLICY "System can archive monthly_costs history" ON monthly_costs_history FOR INSERT WITH CHECK (true);

-- 履歴テーブルへの自動退避トリガー
CREATE OR REPLACE FUNCTION archive_monthly_costs_to_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO monthly_costs_history (
      id, year_month, cost_type, category, amount, notes,
      created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      NEW.id, NEW.year_month, NEW.cost_type, NEW.category, NEW.amount, NEW.notes,
      NEW.created_at, NEW.updated_at, NEW.created_by,
      'INSERT', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO monthly_costs_history (
      id, year_month, cost_type, category, amount, notes,
      created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.year_month, OLD.cost_type, OLD.category, OLD.amount, OLD.notes,
      OLD.created_at, OLD.updated_at, OLD.created_by,
      'UPDATE', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO monthly_costs_history (
      id, year_month, cost_type, category, amount, notes,
      created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.year_month, OLD.cost_type, OLD.category, OLD.amount, OLD.notes,
      OLD.created_at, OLD.updated_at, OLD.created_by,
      'DELETE', auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_archive_monthly_costs
AFTER INSERT OR UPDATE OR DELETE ON monthly_costs
FOR EACH ROW
EXECUTE FUNCTION archive_monthly_costs_to_history();

-- ============================================================================
-- 8. business_days（営業日数）
-- ============================================================================
-- 年間の月別営業日数と臨時休業日数を管理
-- 月給従業員の1日あたりの日給計算に使用（月給/営業日数）

CREATE TABLE business_days (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 対象年
  year INTEGER NOT NULL,                    -- 対象年（例: 2026）

  -- 日数タイプ
  day_type VARCHAR(20) NOT NULL CHECK (day_type IN ('working_days', 'temporary_closure')),
                                            -- working_days=予定営業日数, temporary_closure=臨時休業日数

  -- 各月の日数
  jan INTEGER NOT NULL DEFAULT 0,           -- 1月
  feb INTEGER NOT NULL DEFAULT 0,           -- 2月
  mar INTEGER NOT NULL DEFAULT 0,           -- 3月
  apr INTEGER NOT NULL DEFAULT 0,           -- 4月
  may INTEGER NOT NULL DEFAULT 0,           -- 5月
  jun INTEGER NOT NULL DEFAULT 0,           -- 6月
  jul INTEGER NOT NULL DEFAULT 0,           -- 7月
  aug INTEGER NOT NULL DEFAULT 0,           -- 8月
  sep INTEGER NOT NULL DEFAULT 0,           -- 9月
  oct INTEGER NOT NULL DEFAULT 0,           -- 10月
  nov INTEGER NOT NULL DEFAULT 0,           -- 11月
  dec INTEGER NOT NULL DEFAULT 0,           -- 12月

  -- 備考
  notes TEXT,                               -- 備考

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- 複合ユニーク制約（年とタイプの組み合わせで一意）
  UNIQUE(year, day_type)
);

-- インデックス
CREATE INDEX idx_business_days_year ON business_days(year);
CREATE INDEX idx_business_days_year_type ON business_days(year, day_type);

-- コメント
COMMENT ON TABLE business_days IS '営業日数: 年間の月別営業日数・臨時休業日数を管理';
COMMENT ON COLUMN business_days.year IS '対象年（例: 2026）';
COMMENT ON COLUMN business_days.day_type IS '日数タイプ: working_days=予定営業日数, temporary_closure=臨時休業日数';

-- RLS
ALTER TABLE business_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage business_days" ON business_days FOR ALL USING (auth.role() = 'authenticated');

-- updated_at自動更新トリガー
CREATE TRIGGER update_business_days_updated_at
BEFORE UPDATE ON business_days
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8-H. business_days_history（営業日数履歴）
-- ============================================================================

CREATE TABLE business_days_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 元のレコード情報
  id UUID NOT NULL,
  year INTEGER NOT NULL,
  day_type VARCHAR(20) NOT NULL,
  jan INTEGER NOT NULL,
  feb INTEGER NOT NULL,
  mar INTEGER NOT NULL,
  apr INTEGER NOT NULL,
  may INTEGER NOT NULL,
  jun INTEGER NOT NULL,
  jul INTEGER NOT NULL,
  aug INTEGER NOT NULL,
  sep INTEGER NOT NULL,
  oct INTEGER NOT NULL,
  nov INTEGER NOT NULL,
  dec INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,

  -- 履歴管理情報
  operation_type VARCHAR(10) NOT NULL,     -- 'INSERT', 'UPDATE', 'DELETE'
  operation_at TIMESTAMPTZ DEFAULT NOW(),
  operation_by UUID REFERENCES auth.users(id),
  reason TEXT
);

-- インデックス
CREATE INDEX idx_business_days_history_id ON business_days_history(id);
CREATE INDEX idx_business_days_history_year ON business_days_history(year);
CREATE INDEX idx_business_days_history_operation_at ON business_days_history(operation_at DESC);

-- コメント
COMMENT ON TABLE business_days_history IS '営業日数履歴: 削除・更新・新規作成された営業日数情報を保管';
COMMENT ON COLUMN business_days_history.operation_type IS '操作種別: INSERT（新規作成）, UPDATE（更新前の状態）, DELETE（削除されたレコード）';

-- RLS
ALTER TABLE business_days_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view business_days history" ON business_days_history FOR SELECT USING (true);
CREATE POLICY "System can archive business_days history" ON business_days_history FOR INSERT WITH CHECK (true);

-- 履歴テーブルへの自動退避トリガー
CREATE OR REPLACE FUNCTION archive_business_days_to_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO business_days_history (
      id, year, day_type, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec,
      notes, created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      NEW.id, NEW.year, NEW.day_type, NEW.jan, NEW.feb, NEW.mar, NEW.apr, NEW.may, NEW.jun,
      NEW.jul, NEW.aug, NEW.sep, NEW.oct, NEW.nov, NEW.dec,
      NEW.notes, NEW.created_at, NEW.updated_at, NEW.created_by,
      'INSERT', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO business_days_history (
      id, year, day_type, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec,
      notes, created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.year, OLD.day_type, OLD.jan, OLD.feb, OLD.mar, OLD.apr, OLD.may, OLD.jun,
      OLD.jul, OLD.aug, OLD.sep, OLD.oct, OLD.nov, OLD.dec,
      OLD.notes, OLD.created_at, OLD.updated_at, OLD.created_by,
      'UPDATE', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO business_days_history (
      id, year, day_type, jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec,
      notes, created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.year, OLD.day_type, OLD.jan, OLD.feb, OLD.mar, OLD.apr, OLD.may, OLD.jun,
      OLD.jul, OLD.aug, OLD.sep, OLD.oct, OLD.nov, OLD.dec,
      OLD.notes, OLD.created_at, OLD.updated_at, OLD.created_by,
      'DELETE', auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_archive_business_days
AFTER INSERT OR UPDATE OR DELETE ON business_days
FOR EACH ROW
EXECUTE FUNCTION archive_business_days_to_history();

-- ============================================================================
-- 9. annual_contracts（年間契約マスタ）
-- ============================================================================
-- 公共事業などの年間契約を管理。進行基準で月次収益を按分計算。

CREATE TABLE annual_contracts (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  field_id UUID NOT NULL REFERENCES fields(id) ON DELETE RESTRICT,

  -- 契約情報
  contract_name VARCHAR(255) NOT NULL,           -- 契約名（例: 2026年度 金城公園管理業務）
  fiscal_year INTEGER NOT NULL,                   -- 対象年度（例: 2026）
  contract_start_date DATE NOT NULL,              -- 契約開始日
  contract_end_date DATE NOT NULL,                -- 契約終了日

  -- 金額
  contract_amount INTEGER NOT NULL,               -- 年間契約額（円）

  -- 予算時間（進行基準の分母）
  budget_hours DECIMAL(10, 2) NOT NULL,           -- 年間予算時間（例: 1000時間）

  -- 計算設定
  revenue_recognition_method VARCHAR(20) NOT NULL DEFAULT 'hours_based'
    CHECK (revenue_recognition_method IN ('hours_based', 'days_based', 'equal_monthly')),

  -- 精算
  is_settled BOOLEAN DEFAULT FALSE,               -- 精算済みフラグ
  settled_at TIMESTAMPTZ,                         -- 精算日時
  settlement_adjustment INTEGER DEFAULT 0,        -- 精算時調整額

  -- 備考
  notes TEXT,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- 制約
  CHECK (budget_hours > 0),                       -- 予算時間は正の値
  CHECK (contract_amount > 0),                    -- 契約額は正の値
  CHECK (contract_start_date <= contract_end_date), -- 開始日 <= 終了日
  UNIQUE(field_id, contract_name, fiscal_year)    -- 同一フィールド・年度・契約名で一意
);

-- インデックス
CREATE INDEX idx_annual_contracts_field ON annual_contracts(field_id);
CREATE INDEX idx_annual_contracts_year ON annual_contracts(fiscal_year);
CREATE INDEX idx_annual_contracts_field_year ON annual_contracts(field_id, fiscal_year);

-- コメント
COMMENT ON TABLE annual_contracts IS '年間契約マスタ: 公共事業等の年間契約を管理、進行基準で月次収益按分';
COMMENT ON COLUMN annual_contracts.contract_name IS '契約名（例: 2026年度 金城公園管理業務）';
COMMENT ON COLUMN annual_contracts.fiscal_year IS '対象年度（表示・検索用）';
COMMENT ON COLUMN annual_contracts.budget_hours IS '年間予算時間（進行基準の分母）';
COMMENT ON COLUMN annual_contracts.revenue_recognition_method IS '収益認識方式: hours_based=稼働時間, days_based=稼働日数, equal_monthly=月割均等';
COMMENT ON COLUMN annual_contracts.settlement_adjustment IS '年度末精算時の調整額';

-- RLS
ALTER TABLE annual_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage annual_contracts" ON annual_contracts FOR ALL USING (auth.role() = 'authenticated');

-- updated_at自動更新トリガー
CREATE TRIGGER update_annual_contracts_updated_at
BEFORE UPDATE ON annual_contracts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9-H. annual_contracts_history（年間契約履歴）
-- ============================================================================

CREATE TABLE annual_contracts_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 元のレコード情報
  id UUID NOT NULL,
  field_id UUID NOT NULL,
  contract_name VARCHAR(255) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  contract_start_date DATE NOT NULL,
  contract_end_date DATE NOT NULL,
  contract_amount INTEGER NOT NULL,
  budget_hours DECIMAL(10, 2) NOT NULL,
  revenue_recognition_method VARCHAR(20) NOT NULL,
  is_settled BOOLEAN,
  settled_at TIMESTAMPTZ,
  settlement_adjustment INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,

  -- 履歴管理情報
  operation_type VARCHAR(10) NOT NULL,     -- 'INSERT', 'UPDATE', 'DELETE'
  operation_at TIMESTAMPTZ DEFAULT NOW(),
  operation_by UUID REFERENCES auth.users(id),
  reason TEXT
);

-- インデックス
CREATE INDEX idx_annual_contracts_history_id ON annual_contracts_history(id);
CREATE INDEX idx_annual_contracts_history_field ON annual_contracts_history(field_id);
CREATE INDEX idx_annual_contracts_history_year ON annual_contracts_history(fiscal_year);
CREATE INDEX idx_annual_contracts_history_operation_at ON annual_contracts_history(operation_at DESC);

-- コメント
COMMENT ON TABLE annual_contracts_history IS '年間契約履歴: 削除・更新された年間契約情報を保管';

-- RLS
ALTER TABLE annual_contracts_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view annual_contracts history" ON annual_contracts_history FOR SELECT USING (true);
CREATE POLICY "System can archive annual_contracts history" ON annual_contracts_history FOR INSERT WITH CHECK (true);

-- 履歴テーブルへの自動退避トリガー
CREATE OR REPLACE FUNCTION archive_annual_contracts_to_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO annual_contracts_history (
      id, field_id, contract_name, fiscal_year, contract_start_date, contract_end_date,
      contract_amount, budget_hours, revenue_recognition_method,
      is_settled, settled_at, settlement_adjustment, notes,
      created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      NEW.id, NEW.field_id, NEW.contract_name, NEW.fiscal_year, NEW.contract_start_date, NEW.contract_end_date,
      NEW.contract_amount, NEW.budget_hours, NEW.revenue_recognition_method,
      NEW.is_settled, NEW.settled_at, NEW.settlement_adjustment, NEW.notes,
      NEW.created_at, NEW.updated_at, NEW.created_by,
      'INSERT', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO annual_contracts_history (
      id, field_id, contract_name, fiscal_year, contract_start_date, contract_end_date,
      contract_amount, budget_hours, revenue_recognition_method,
      is_settled, settled_at, settlement_adjustment, notes,
      created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.field_id, OLD.contract_name, OLD.fiscal_year, OLD.contract_start_date, OLD.contract_end_date,
      OLD.contract_amount, OLD.budget_hours, OLD.revenue_recognition_method,
      OLD.is_settled, OLD.settled_at, OLD.settlement_adjustment, OLD.notes,
      OLD.created_at, OLD.updated_at, OLD.created_by,
      'UPDATE', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO annual_contracts_history (
      id, field_id, contract_name, fiscal_year, contract_start_date, contract_end_date,
      contract_amount, budget_hours, revenue_recognition_method,
      is_settled, settled_at, settlement_adjustment, notes,
      created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.field_id, OLD.contract_name, OLD.fiscal_year, OLD.contract_start_date, OLD.contract_end_date,
      OLD.contract_amount, OLD.budget_hours, OLD.revenue_recognition_method,
      OLD.is_settled, OLD.settled_at, OLD.settlement_adjustment, OLD.notes,
      OLD.created_at, OLD.updated_at, OLD.created_by,
      'DELETE', auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_archive_annual_contracts
AFTER INSERT OR UPDATE OR DELETE ON annual_contracts
FOR EACH ROW
EXECUTE FUNCTION archive_annual_contracts_to_history();

-- ============================================================================
-- 10. monthly_revenue_allocations（月次収益配分）
-- ============================================================================
-- 年間契約の月次収益認識結果を記録（監査証跡・再計算の効率化）

CREATE TABLE monthly_revenue_allocations (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  annual_contract_id UUID NOT NULL REFERENCES annual_contracts(id) ON DELETE CASCADE,

  -- 対象年月（月初日で保存）
  allocation_month DATE NOT NULL,                 -- 対象年月（例: 2026-01-01）

  -- 実績
  actual_hours DECIMAL(10, 2) NOT NULL DEFAULT 0,  -- 当月実稼働時間
  cumulative_hours DECIMAL(10, 2) NOT NULL DEFAULT 0, -- 累計稼働時間

  -- 収益計算
  allocation_rate DECIMAL(8, 6) NOT NULL DEFAULT 0,   -- 配分率（当月時間/年間予算時間）
  cumulative_rate DECIMAL(8, 6) NOT NULL DEFAULT 0,   -- 累計配分率
  allocated_revenue INTEGER NOT NULL DEFAULT 0,       -- 当月認識収益
  cumulative_revenue INTEGER NOT NULL DEFAULT 0,      -- 累計認識収益
  adjustment_amount INTEGER NOT NULL DEFAULT 0,       -- 調整額（精算時）

  -- 参考情報
  remaining_budget_hours DECIMAL(10, 2),            -- 残予算時間
  projected_annual_hours DECIMAL(10, 2),            -- 年間見込み時間（進捗から推計）

  -- ステータス
  status VARCHAR(20) NOT NULL DEFAULT 'provisional'
    CHECK (status IN ('provisional', 'confirmed', 'adjusted')),

  -- メタデータ
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 制約
  CHECK (allocation_month = date_trunc('month', allocation_month)::date), -- 月初日のみ（明示的キャスト）
  CHECK (actual_hours >= 0),                      -- 実稼働時間は非負値
  CHECK (cumulative_hours >= 0),                  -- 累計時間は非負値
  CHECK (allocation_rate >= 0),                   -- 配分率は非負値
  CHECK (cumulative_rate >= 0),                   -- 累計配分率は非負値
  UNIQUE(annual_contract_id, allocation_month)
);

-- インデックス
CREATE INDEX idx_monthly_allocations_contract ON monthly_revenue_allocations(annual_contract_id);
CREATE INDEX idx_monthly_allocations_month ON monthly_revenue_allocations(allocation_month);
CREATE INDEX idx_monthly_allocations_contract_month ON monthly_revenue_allocations(annual_contract_id, allocation_month);
CREATE INDEX idx_monthly_allocations_status ON monthly_revenue_allocations(status);

-- コメント
COMMENT ON TABLE monthly_revenue_allocations IS '月次収益配分: 年間契約の月次収益認識結果を記録';
COMMENT ON COLUMN monthly_revenue_allocations.allocation_month IS '対象年月（月初日で保存、例: 2026-01-01）';
COMMENT ON COLUMN monthly_revenue_allocations.actual_hours IS '当月の実稼働時間';
COMMENT ON COLUMN monthly_revenue_allocations.cumulative_hours IS '契約開始からの累計稼働時間';
COMMENT ON COLUMN monthly_revenue_allocations.allocation_rate IS '当月配分率（当月時間/年間予算時間）';
COMMENT ON COLUMN monthly_revenue_allocations.allocated_revenue IS '当月認識収益（累計ベースで計算後の差分）';
COMMENT ON COLUMN monthly_revenue_allocations.adjustment_amount IS '精算時の調整額';
COMMENT ON COLUMN monthly_revenue_allocations.status IS 'ステータス: provisional=暫定, confirmed=確定, adjusted=精算済';

-- RLS
ALTER TABLE monthly_revenue_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage monthly_allocations" ON monthly_revenue_allocations FOR ALL USING (auth.role() = 'authenticated');

-- updated_at自動更新トリガー
CREATE TRIGGER update_monthly_allocations_updated_at
BEFORE UPDATE ON monthly_revenue_allocations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10-H. monthly_revenue_allocations_history（月次収益配分履歴）
-- ============================================================================

CREATE TABLE monthly_revenue_allocations_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 元のレコード情報
  id UUID NOT NULL,
  annual_contract_id UUID NOT NULL,
  allocation_month DATE NOT NULL,
  actual_hours DECIMAL(10, 2) NOT NULL,
  cumulative_hours DECIMAL(10, 2) NOT NULL,
  allocation_rate DECIMAL(8, 6) NOT NULL,
  cumulative_rate DECIMAL(8, 6) NOT NULL,
  allocated_revenue INTEGER NOT NULL,
  cumulative_revenue INTEGER NOT NULL,
  adjustment_amount INTEGER NOT NULL,
  remaining_budget_hours DECIMAL(10, 2),
  projected_annual_hours DECIMAL(10, 2),
  status VARCHAR(20) NOT NULL,
  calculated_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  -- 履歴管理情報
  operation_type VARCHAR(10) NOT NULL,
  operation_at TIMESTAMPTZ DEFAULT NOW(),
  operation_by UUID REFERENCES auth.users(id),
  reason TEXT
);

-- インデックス
CREATE INDEX idx_monthly_allocations_history_id ON monthly_revenue_allocations_history(id);
CREATE INDEX idx_monthly_allocations_history_contract ON monthly_revenue_allocations_history(annual_contract_id);
CREATE INDEX idx_monthly_allocations_history_month ON monthly_revenue_allocations_history(allocation_month);
CREATE INDEX idx_monthly_allocations_history_operation_at ON monthly_revenue_allocations_history(operation_at DESC);

-- コメント
COMMENT ON TABLE monthly_revenue_allocations_history IS '月次収益配分履歴: 削除・更新された月次収益配分情報を保管';

-- RLS
ALTER TABLE monthly_revenue_allocations_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view monthly_allocations history" ON monthly_revenue_allocations_history FOR SELECT USING (true);
CREATE POLICY "System can archive monthly_allocations history" ON monthly_revenue_allocations_history FOR INSERT WITH CHECK (true);

-- 履歴テーブルへの自動退避トリガー
CREATE OR REPLACE FUNCTION archive_monthly_allocations_to_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO monthly_revenue_allocations_history (
      id, annual_contract_id, allocation_month,
      actual_hours, cumulative_hours, allocation_rate, cumulative_rate,
      allocated_revenue, cumulative_revenue, adjustment_amount,
      remaining_budget_hours, projected_annual_hours, status,
      calculated_at, confirmed_at, notes, created_at, updated_at,
      operation_type, operation_by
    ) VALUES (
      NEW.id, NEW.annual_contract_id, NEW.allocation_month,
      NEW.actual_hours, NEW.cumulative_hours, NEW.allocation_rate, NEW.cumulative_rate,
      NEW.allocated_revenue, NEW.cumulative_revenue, NEW.adjustment_amount,
      NEW.remaining_budget_hours, NEW.projected_annual_hours, NEW.status,
      NEW.calculated_at, NEW.confirmed_at, NEW.notes, NEW.created_at, NEW.updated_at,
      'INSERT', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO monthly_revenue_allocations_history (
      id, annual_contract_id, allocation_month,
      actual_hours, cumulative_hours, allocation_rate, cumulative_rate,
      allocated_revenue, cumulative_revenue, adjustment_amount,
      remaining_budget_hours, projected_annual_hours, status,
      calculated_at, confirmed_at, notes, created_at, updated_at,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.annual_contract_id, OLD.allocation_month,
      OLD.actual_hours, OLD.cumulative_hours, OLD.allocation_rate, OLD.cumulative_rate,
      OLD.allocated_revenue, OLD.cumulative_revenue, OLD.adjustment_amount,
      OLD.remaining_budget_hours, OLD.projected_annual_hours, OLD.status,
      OLD.calculated_at, OLD.confirmed_at, OLD.notes, OLD.created_at, OLD.updated_at,
      'UPDATE', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO monthly_revenue_allocations_history (
      id, annual_contract_id, allocation_month,
      actual_hours, cumulative_hours, allocation_rate, cumulative_rate,
      allocated_revenue, cumulative_revenue, adjustment_amount,
      remaining_budget_hours, projected_annual_hours, status,
      calculated_at, confirmed_at, notes, created_at, updated_at,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.annual_contract_id, OLD.allocation_month,
      OLD.actual_hours, OLD.cumulative_hours, OLD.allocation_rate, OLD.cumulative_rate,
      OLD.allocated_revenue, OLD.cumulative_revenue, OLD.adjustment_amount,
      OLD.remaining_budget_hours, OLD.projected_annual_hours, OLD.status,
      OLD.calculated_at, OLD.confirmed_at, OLD.notes, OLD.created_at, OLD.updated_at,
      'DELETE', auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_archive_monthly_allocations
AFTER INSERT OR UPDATE OR DELETE ON monthly_revenue_allocations
FOR EACH ROW
EXECUTE FUNCTION archive_monthly_allocations_to_history();

-- ============================================================================
-- projects.annual_contract_id への外部キー制約追加
-- ============================================================================
-- annual_contracts テーブル作成後に追加

ALTER TABLE projects
ADD CONSTRAINT fk_projects_annual_contract
FOREIGN KEY (annual_contract_id) REFERENCES annual_contracts(id) ON DELETE SET NULL;

-- ============================================================================
-- リアルタイム機能の有効化
-- ============================================================================

-- Supabaseのリアルタイム購読を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE fields;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE work_days;
ALTER PUBLICATION supabase_realtime ADD TABLE work_records;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE employees;
ALTER PUBLICATION supabase_realtime ADD TABLE monthly_costs;
ALTER PUBLICATION supabase_realtime ADD TABLE business_days;
ALTER PUBLICATION supabase_realtime ADD TABLE annual_contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE monthly_revenue_allocations;

-- 履歴テーブルもリアルタイム対象に（監査用）
ALTER PUBLICATION supabase_realtime ADD TABLE fields_history;
ALTER PUBLICATION supabase_realtime ADD TABLE projects_history;
ALTER PUBLICATION supabase_realtime ADD TABLE work_days_history;
ALTER PUBLICATION supabase_realtime ADD TABLE work_records_history;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses_history;
ALTER PUBLICATION supabase_realtime ADD TABLE employees_history;
ALTER PUBLICATION supabase_realtime ADD TABLE monthly_costs_history;
ALTER PUBLICATION supabase_realtime ADD TABLE business_days_history;
ALTER PUBLICATION supabase_realtime ADD TABLE annual_contracts_history;
ALTER PUBLICATION supabase_realtime ADD TABLE monthly_revenue_allocations_history;

-- ============================================================================
-- ビュー: 履歴を含む完全なデータ表示
-- ============================================================================

-- 現場の完全な履歴ビュー（現在＋過去）
CREATE VIEW fields_full_history AS
SELECT
  id,
  field_code,
  field_name,
  customer_name,
  address,
  has_electricity,
  has_water,
  has_toilet,
  toilet_distance,
  travel_distance_km,
  travel_time_minutes,
  travel_cost,
  notes,
  warnings,
  created_at,
  updated_at,
  created_by,
  'CURRENT' AS status,
  updated_at AS valid_from,
  NULL::TIMESTAMPTZ AS valid_to,
  NULL AS operation_by
FROM fields
UNION ALL
SELECT
  id,
  field_code,
  field_name,
  customer_name,
  address,
  has_electricity,
  has_water,
  has_toilet,
  toilet_distance,
  travel_distance_km,
  travel_time_minutes,
  travel_cost,
  notes,
  warnings,
  created_at,
  updated_at,
  created_by,
  operation_type AS status,
  updated_at AS valid_from,
  operation_at AS valid_to,
  operation_by
FROM fields_history
ORDER BY id, valid_from DESC;

COMMENT ON VIEW fields_full_history IS '現場の完全な履歴ビュー: 現在のレコードと過去の履歴を統合して表示';

-- ============================================================================
-- アプリケーション設定テーブル
-- ============================================================================
-- 基準住所（距離計算用）などのアプリケーション設定を保存

CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) NOT NULL DEFAULT 'string'
    CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE app_settings IS 'アプリケーション設定';
COMMENT ON COLUMN app_settings.setting_key IS '設定キー（一意）';
COMMENT ON COLUMN app_settings.setting_value IS '設定値（文字列）';
COMMENT ON COLUMN app_settings.setting_type IS '設定値の型（string/number/boolean/json）';
COMMENT ON COLUMN app_settings.description IS '設定の説明';

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view settings"
  ON app_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert settings"
  ON app_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update settings"
  ON app_settings FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete settings"
  ON app_settings FOR DELETE
  USING (auth.role() = 'authenticated');

-- updated_at 自動更新トリガー
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 基準住所一括保存RPC（トランザクションで整合性を保証）
CREATE OR REPLACE FUNCTION save_base_address_settings(
  p_address TEXT,
  p_lat NUMERIC,
  p_lng NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 3つの設定を同一トランザクションで保存
  INSERT INTO app_settings (setting_key, setting_value, setting_type, description, updated_by)
  VALUES
    ('base_address', p_address, 'string', '基準住所（距離計算の起点）', auth.uid()),
    ('base_lat', p_lat::TEXT, 'number', '基準住所の緯度', auth.uid()),
    ('base_lng', p_lng::TEXT, 'number', '基準住所の経度', auth.uid())
  ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW(),
    updated_by = EXCLUDED.updated_by;
END;
$$;

-- ============================================================================
-- 完了
-- ============================================================================
-- このスキーマをSupabaseのSQL Editorで実行してください。
-- 実行後、Supabase Studioでテーブルが作成されていることを確認してください。
--
-- 【履歴テーブルの使い方】
-- - 削除・更新時は自動的に履歴テーブルに退避されます
-- - 履歴テーブルは閲覧のみ可能（RLSで保護）
-- - fields_full_historyビューで現在＋過去の全履歴を確認できます
