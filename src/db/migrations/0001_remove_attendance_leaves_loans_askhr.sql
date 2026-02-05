-- Migration: Remove Attendance, Leaves, Loans, and Ask HR modules
-- Created: 2026-02-05
-- Description: Drops all tables and enums related to attendance, leave management, loan management, and ask HR modules

-- Drop tables in correct order (respecting foreign key dependencies)

-- Drop attendance tables
DROP TABLE IF EXISTS "attendance" CASCADE;
DROP TABLE IF EXISTS "attendance_settings" CASCADE;

-- Drop leave tables
DROP TABLE IF EXISTS "leave_balances" CASCADE;
DROP TABLE IF EXISTS "leave_applications" CASCADE;
DROP TABLE IF EXISTS "annual_leave_settings" CASCADE;
DROP TABLE IF EXISTS "leave_types" CASCADE;

-- Drop ask HR tables
DROP TABLE IF EXISTS "ask_hr_responses" CASCADE;
DROP TABLE IF EXISTS "ask_hr_questions" CASCADE;

-- Drop loan tables
DROP TABLE IF EXISTS "loan_history" CASCADE;
DROP TABLE IF EXISTS "loan_repayments" CASCADE;
DROP TABLE IF EXISTS "loan_applications" CASCADE;
DROP TABLE IF EXISTS "loan_type_salary_structures" CASCADE;
DROP TABLE IF EXISTS "loan_types" CASCADE;

-- Drop enums

-- Attendance enums
DROP TYPE IF EXISTS "attendance_status" CASCADE;

-- Leave enums
DROP TYPE IF EXISTS "leave_status" CASCADE;
DROP TYPE IF EXISTS "leave_type" CASCADE;

-- Ask HR enums
DROP TYPE IF EXISTS "ask_hr_status" CASCADE;
DROP TYPE IF EXISTS "ask_hr_category" CASCADE;

-- Loan enums
DROP TYPE IF EXISTS "loan_application_status" CASCADE;
DROP TYPE IF EXISTS "loan_amount_type" CASCADE;
DROP TYPE IF EXISTS "repayment_status" CASCADE;

-- Clean up loan references from payroll schema
ALTER TABLE "payrun_item_details" DROP COLUMN IF EXISTS "loan_application_id" CASCADE;

-- Note: Removing "loan" from deduction_type and payroll_detail_type enums
-- requires recreating the enums. This will be handled by the schema changes.
-- If you encounter enum value errors, you may need to manually update existing records.
