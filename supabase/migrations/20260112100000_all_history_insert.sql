-- ==============================================
-- 全履歴テーブル: INSERT対応トリガー追加
-- ==============================================
-- 作成日: 2026年1月12日
-- 目的: 全テーブルでINSERT操作も履歴に記録し、監査ログの完全性を確保
-- ==============================================

-- ============================================
-- 1. fields_history - INSERT対応
-- ============================================

DROP TRIGGER IF EXISTS trg_archive_fields ON fields;

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

-- ============================================
-- 2. projects_history - INSERT対応
-- ============================================

DROP TRIGGER IF EXISTS trg_archive_projects ON projects;

CREATE OR REPLACE FUNCTION archive_projects_to_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO projects_history (
      id, field_id, project_number, implementation_date,
      work_type_pruning, work_type_weeding, work_type_cleaning, work_type_other,
      estimate_amount, invoice_amount, labor_cost, expense_total,
      review_good_points, review_improvements, review_next_actions,
      created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      NEW.id, NEW.field_id, NEW.project_number, NEW.implementation_date,
      NEW.work_type_pruning, NEW.work_type_weeding, NEW.work_type_cleaning, NEW.work_type_other,
      NEW.estimate_amount, NEW.invoice_amount, NEW.labor_cost, NEW.expense_total,
      NEW.review_good_points, NEW.review_improvements, NEW.review_next_actions,
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
      created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.field_id, OLD.project_number, OLD.implementation_date,
      OLD.work_type_pruning, OLD.work_type_weeding, OLD.work_type_cleaning, OLD.work_type_other,
      OLD.estimate_amount, OLD.invoice_amount, OLD.labor_cost, OLD.expense_total,
      OLD.review_good_points, OLD.review_improvements, OLD.review_next_actions,
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
      created_at, updated_at, created_by,
      operation_type, operation_by
    ) VALUES (
      OLD.id, OLD.field_id, OLD.project_number, OLD.implementation_date,
      OLD.work_type_pruning, OLD.work_type_weeding, OLD.work_type_cleaning, OLD.work_type_other,
      OLD.estimate_amount, OLD.invoice_amount, OLD.labor_cost, OLD.expense_total,
      OLD.review_good_points, OLD.review_improvements, OLD.review_next_actions,
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

-- ============================================
-- 3. work_days_history - INSERT対応
-- ============================================

DROP TRIGGER IF EXISTS trg_archive_work_days ON work_days;

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

-- ============================================
-- 4. work_records_history - INSERT対応
-- ============================================

DROP TRIGGER IF EXISTS trg_archive_work_records ON work_records;

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

-- ============================================
-- 5. expenses_history - INSERT対応
-- ============================================

DROP TRIGGER IF EXISTS trg_archive_expenses ON expenses;

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

-- ============================================
-- 6. monthly_costs_history - INSERT対応
-- ============================================

DROP TRIGGER IF EXISTS trg_archive_monthly_costs ON monthly_costs;

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
