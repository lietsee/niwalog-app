-- ==============================================
-- 従業員履歴: INSERT対応トリガー追加
-- ==============================================

-- 1. 既存トリガーを削除
DROP TRIGGER IF EXISTS trg_archive_employees ON employees;

-- 2. トリガー関数を更新（INSERT対応追加）
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

-- 3. トリガーを再作成（INSERT追加、AFTERに変更）
CREATE TRIGGER trg_archive_employees
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW
EXECUTE FUNCTION archive_employees_to_history();
