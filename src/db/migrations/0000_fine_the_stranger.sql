CREATE TYPE "public"."attendance_status" AS ENUM('Approved', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('Full-time', 'Part-time', 'Contract', 'Intern');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('Pending', 'Approved', 'Rejected', 'Cancelled', 'To be reviewed');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('Annual', 'Sick', 'Personal', 'Maternity', 'Paternity', 'Bereavement', 'Unpaid', 'Other');--> statement-breakpoint
CREATE TYPE "public"."marital_status" AS ENUM('Single', 'Married', 'Divorced', 'Widowed');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('pending', 'in-progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('approval', 'deadline', 'message');--> statement-breakpoint
CREATE TYPE "public"."payment_status_type" AS ENUM('successful', 'pending', 'failed');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('Accepted', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('Low', 'Medium', 'High', 'Urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('Backlog', 'Todo', 'In Progress', 'Review', 'Completed', 'Pending');--> statement-breakpoint
CREATE TYPE "public"."allowance_type" AS ENUM('one-time', 'monthly', 'annual', 'bi-annual', 'quarterly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."deduction_type" AS ENUM('recurring', 'one-time', 'statutory', 'loan', 'advance');--> statement-breakpoint
CREATE TYPE "public"."payroll_detail_type" AS ENUM('base_salary', 'allowance', 'deduction', 'bonus', 'overtime', 'commission', 'reimbursement', 'tax', 'loan', 'advance');--> statement-breakpoint
CREATE TYPE "public"."payroll_item_type" AS ENUM('salary', 'allowance', 'bonus', 'overtime', 'commission', 'reimbursement');--> statement-breakpoint
CREATE TYPE "public"."payroll_run_status" AS ENUM('draft', 'pending', 'processing', 'completed', 'approved', 'paid', 'archived');--> statement-breakpoint
CREATE TYPE "public"."payrun_type" AS ENUM('salary', 'allowance');--> statement-breakpoint
CREATE TYPE "public"."date_format" AS ENUM('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'fr', 'es', 'de');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."timezone" AS ENUM('UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Dubai', 'Africa/Lagos');--> statement-breakpoint
CREATE TYPE "public"."ask_hr_category" AS ENUM('General', 'Benefits', 'Payroll', 'Leave', 'Employment', 'Workplace', 'Training', 'Other');--> statement-breakpoint
CREATE TYPE "public"."ask_hr_status" AS ENUM('Open', 'In Progress', 'Redirected', 'Answered', 'Closed');--> statement-breakpoint
CREATE TYPE "public"."loan_amount_type" AS ENUM('fixed', 'percentage');--> statement-breakpoint
CREATE TYPE "public"."loan_application_status" AS ENUM('pending', 'hr_approved', 'hr_rejected', 'disbursed', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."repayment_status" AS ENUM('pending', 'paid', 'partial', 'overdue', 'waived');--> statement-breakpoint
CREATE TYPE "public"."news_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"logo_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"username" text,
	"display_username" text,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annual_leave_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"allocated_days" integer DEFAULT 30 NOT NULL,
	"year" integer NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "annual_leave_settings_year_unique" UNIQUE("year")
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"date" date NOT NULL,
	"sign_in_time" timestamp,
	"sign_out_time" timestamp,
	"sign_in_latitude" numeric(10, 8),
	"sign_in_longitude" numeric(11, 8),
	"sign_in_location" text,
	"status" "attendance_status" DEFAULT 'Approved' NOT NULL,
	"rejection_reason" text,
	"rejected_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"sign_in_start_time" text DEFAULT '06:00' NOT NULL,
	"sign_in_end_time" text DEFAULT '09:00' NOT NULL,
	"sign_out_start_time" text DEFAULT '14:00' NOT NULL,
	"sign_out_end_time" text DEFAULT '20:00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"auth_id" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"staff_number" text,
	"role" text NOT NULL,
	"is_manager" boolean DEFAULT false NOT NULL,
	"department" text NOT NULL,
	"manager_id" integer,
	"date_of_birth" date,
	"address" text,
	"status" text,
	"marital_status" "marital_status",
	"employment_type" "employment_type",
	"document_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "employees_bank" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"bank_name" text NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"document_name" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" numeric(10, 2) NOT NULL,
	"mime_type" text,
	"uploaded_by" integer,
	"department" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employment_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"start_date" date,
	"end_date" date,
	"department" text,
	"employment_type" "employment_type",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_days" integer NOT NULL,
	"reason" text NOT NULL,
	"status" "leave_status" DEFAULT 'Pending' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"total_days" integer DEFAULT 0 NOT NULL,
	"used_days" integer DEFAULT 0 NOT NULL,
	"remaining_days" integer DEFAULT 0 NOT NULL,
	"year" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"max_days" integer,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leave_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "email" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" integer NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"parent_email_id" integer,
	"type" text DEFAULT 'sent' NOT NULL,
	"has_been_opened" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_attachment" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_id" integer NOT NULL,
	"document_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_recipient" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_id" integer NOT NULL,
	"recipient_id" integer,
	"external_email" text,
	"external_name" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"archived_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contractors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"specialization" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" text NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"spent_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" timestamp,
	"completed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"location" text,
	"status" "project_status" DEFAULT 'pending' NOT NULL,
	"budget_planned" integer DEFAULT 0 NOT NULL,
	"budget_actual" integer DEFAULT 0 NOT NULL,
	"supervisor_id" integer,
	"contractor_id" integer,
	"creator_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"upstash_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"original_file_name" text,
	"department" text NOT NULL,
	"departmental" boolean DEFAULT false,
	"folder_id" integer,
	"current_version" integer DEFAULT 0 NOT NULL,
	"current_version_id" integer DEFAULT 0 NOT NULL,
	"public" boolean DEFAULT false,
	"uploaded_by" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"access_level" text NOT NULL,
	"document_id" integer NOT NULL,
	"user_id" integer,
	"department" text,
	"granted_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer,
	"user_id" integer,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_id" integer,
	"root" boolean DEFAULT true NOT NULL,
	"department" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"departmental" boolean DEFAULT false NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"document_id" integer,
	"document_version_id" integer,
	"action" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_shared_link" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer,
	"token" text NOT NULL,
	"expires_at" timestamp,
	"access_level" text DEFAULT 'View',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_shared_link_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "document_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer,
	"tag" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"version_number" integer NOT NULL,
	"file_path" text NOT NULL,
	"file_size" numeric(10, 2) NOT NULL,
	"mime_type" text,
	"scanned_ocr" text,
	"uploaded_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" serial NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"notification_type" "notification_type" NOT NULL,
	"created_by" serial NOT NULL,
	"reference_id" serial NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" serial NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"in_app_notifications" boolean DEFAULT true NOT NULL,
	"email_on_in_app_message" boolean DEFAULT true NOT NULL,
	"email_on_task_notification" boolean DEFAULT false NOT NULL,
	"email_on_general_notification" boolean DEFAULT false NOT NULL,
	"notify_on_message" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payer_name" text NOT NULL,
	"account_number" text NOT NULL,
	"bank_name" text,
	"amount" serial NOT NULL,
	"currency" text DEFAULT 'NGN',
	"payment_reference" text,
	"payment_date" timestamp DEFAULT now(),
	"payment_status_type" "payment_status_type" DEFAULT 'pending',
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"submission_id" integer NOT NULL,
	"reviewed_by" integer NOT NULL,
	"status" "review_status" NOT NULL,
	"review_note" text,
	"reviewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"submitted_by" integer NOT NULL,
	"submission_note" text,
	"submitted_files" jsonb,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"assigned_to" integer NOT NULL,
	"assigned_by" integer NOT NULL,
	"project_id" integer,
	"milestone_id" integer,
	"status" "task_status" DEFAULT 'Todo' NOT NULL,
	"priority" "task_priority" DEFAULT 'Medium' NOT NULL,
	"due_date" date,
	"attachments" jsonb,
	"links" jsonb,
	"progress_completed" integer DEFAULT 0,
	"progress_total" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_assignees" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_label_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"label_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_labels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "balance_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"transaction_type" text DEFAULT 'top-up' NOT NULL,
	"description" text,
	"balance_before" numeric(15, 2) NOT NULL,
	"balance_after" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_balance" (
	"id" serial PRIMARY KEY NOT NULL,
	"balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"amount" numeric(15, 2) NOT NULL,
	"category" text,
	"expense_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "allowances" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "allowance_type" DEFAULT 'one-time' NOT NULL,
	"percentage" numeric(5, 2),
	"amount" numeric(15, 2),
	"taxable" boolean DEFAULT false NOT NULL,
	"tax_percentage" numeric(5, 2),
	"description" text,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deductions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"percentage" numeric(5, 2),
	"amount" numeric(15, 2),
	"type" "deduction_type" DEFAULT 'recurring' NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_allowances" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"allowance_id" integer NOT NULL,
	"effective_from" timestamp DEFAULT now(),
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_deductions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"employee_id" integer NOT NULL,
	"salary_structure_id" integer NOT NULL,
	"type" "deduction_type",
	"amount" numeric(15, 2),
	"percentage" numeric(5, 2),
	"original_amount" numeric(15, 2),
	"remaining_amount" numeric(15, 2),
	"active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp DEFAULT now(),
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_salary" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"salary_structure_id" integer NOT NULL,
	"effective_from" timestamp DEFAULT now(),
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payrun" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "payrun_type" DEFAULT 'salary' NOT NULL,
	"allowance_id" integer,
	"day" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"total_employees" integer DEFAULT 0 NOT NULL,
	"total_gross_pay" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_net_pay" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" "payroll_run_status" DEFAULT 'draft',
	"generated_by" integer NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"completed_by" integer,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_payrun_payroll_period" UNIQUE("year","month","day","type","allowance_id")
);
--> statement-breakpoint
CREATE TABLE "payrun_item_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"payrun_item_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"detail_type" "payroll_detail_type" NOT NULL,
	"description" text NOT NULL,
	"allowance_id" integer,
	"deduction_id" integer,
	"employee_allowance_id" integer,
	"employee_deduction_id" integer,
	"loan_application_id" integer,
	"amount" numeric(15, 2) NOT NULL,
	"original_amount" numeric(15, 2),
	"remaining_amount" numeric(15, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payrun_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "payroll_item_type" DEFAULT 'salary' NOT NULL,
	"payrun_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"base_salary" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_allowances" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(15, 2) DEFAULT '0' NOT NULL,
	"gross_pay" numeric(15, 2) DEFAULT '0' NOT NULL,
	"taxable_income" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_taxes" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_pay" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" "payroll_run_status" DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_payrun_item" UNIQUE("payrun_id","employee_id")
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" serial PRIMARY KEY NOT NULL,
	"payroll_item_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"file_path" text,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salary_allowances" (
	"id" serial PRIMARY KEY NOT NULL,
	"salary_structure_id" integer NOT NULL,
	"allowance_id" integer NOT NULL,
	"effective_from" timestamp DEFAULT now(),
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_deductions" (
	"id" serial PRIMARY KEY NOT NULL,
	"salary_structure_id" integer NOT NULL,
	"deduction_id" integer NOT NULL,
	"effective_from" timestamp DEFAULT now(),
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_structure" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"base_salary" numeric(15, 2) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"employee_count" integer DEFAULT 0 NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"theme" "theme" DEFAULT 'system' NOT NULL,
	"language" "language" DEFAULT 'en' NOT NULL,
	"date_format" date_format DEFAULT 'MM/DD/YYYY' NOT NULL,
	"timezone" timezone DEFAULT 'UTC' NOT NULL,
	"sidebar_collapsed" text DEFAULT 'false',
	"default_view" text DEFAULT 'dashboard',
	"items_per_page" text DEFAULT '10',
	"profile_visibility" text DEFAULT 'private',
	"email_digest" text DEFAULT 'daily',
	"compact_mode" text DEFAULT 'false',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "ask_hr_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"title" text NOT NULL,
	"question" text NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"allow_public_responses" boolean DEFAULT false NOT NULL,
	"category" "ask_hr_category" NOT NULL,
	"status" "ask_hr_status" DEFAULT 'Open' NOT NULL,
	"redirected_to" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ask_hr_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"respondent_id" integer NOT NULL,
	"response" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference_number" text NOT NULL,
	"employee_id" integer NOT NULL,
	"loan_type_id" integer NOT NULL,
	"requested_amount" numeric(15, 2) NOT NULL,
	"approved_amount" numeric(15, 2),
	"monthly_deduction" numeric(15, 2),
	"tenure_months" integer NOT NULL,
	"reason" text NOT NULL,
	"status" "loan_application_status" DEFAULT 'pending' NOT NULL,
	"hr_reviewed_by" integer,
	"hr_reviewed_at" timestamp,
	"hr_remarks" text,
	"disbursed_by" integer,
	"disbursed_at" timestamp,
	"disbursement_remarks" text,
	"employee_deduction_id" integer,
	"total_repaid" numeric(15, 2) DEFAULT '0' NOT NULL,
	"remaining_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "loan_applications_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "loan_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_application_id" integer NOT NULL,
	"action" text NOT NULL,
	"description" text NOT NULL,
	"performed_by" integer,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_repayments" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_application_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"installment_number" integer NOT NULL,
	"due_date" timestamp NOT NULL,
	"expected_amount" numeric(15, 2) NOT NULL,
	"paid_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"balance_after" numeric(15, 2),
	"status" "repayment_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"payrun_id" integer,
	"payrun_item_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_loan_installment" UNIQUE("loan_application_id","installment_number")
);
--> statement-breakpoint
CREATE TABLE "loan_type_salary_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_type_id" integer NOT NULL,
	"salary_structure_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_loan_type_salary_structure" UNIQUE("loan_type_id","salary_structure_id")
);
--> statement-breakpoint
CREATE TABLE "loan_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"amount_type" "loan_amount_type" DEFAULT 'fixed' NOT NULL,
	"fixed_amount" numeric(15, 2),
	"max_percentage" numeric(5, 2),
	"tenure_months" integer NOT NULL,
	"interest_rate" numeric(5, 2) DEFAULT '0',
	"min_service_months" integer DEFAULT 0,
	"max_active_loans" integer DEFAULT 1,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "loan_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "news_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"author_id" serial NOT NULL,
	"status" "news_status" DEFAULT 'draft' NOT NULL,
	"comments_enabled" boolean DEFAULT true NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"user_id" serial NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bug_report_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"bug_report_id" serial NOT NULL,
	"upstash_id" varchar(255) NOT NULL,
	"original_file_name" varchar(500) NOT NULL,
	"file_path" text NOT NULL,
	"file_size" varchar(50) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bug_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"severity" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"steps_to_reproduce" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_rejected_by_employees_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees_bank" ADD CONSTRAINT "employees_bank_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees_documents" ADD CONSTRAINT "employees_documents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees_documents" ADD CONSTRAINT "employees_documents_uploaded_by_employees_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment_history" ADD CONSTRAINT "employment_history_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_approved_by_employees_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email" ADD CONSTRAINT "email_sender_id_employees_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_attachment" ADD CONSTRAINT "email_attachment_email_id_email_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."email"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_attachment" ADD CONSTRAINT "email_attachment_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_recipient" ADD CONSTRAINT "email_recipient_email_id_email_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."email"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_recipient" ADD CONSTRAINT "email_recipient_recipient_id_employees_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_supervisor_id_employees_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_creator_id_employees_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_folder_id_document_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."document_folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_uploaded_by_employees_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access" ADD CONSTRAINT "document_access_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access" ADD CONSTRAINT "document_access_user_id_employees_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access" ADD CONSTRAINT "document_access_granted_by_employees_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_user_id_employees_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."document_folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_logs" ADD CONSTRAINT "document_logs_user_id_employees_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_logs" ADD CONSTRAINT "document_logs_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_logs" ADD CONSTRAINT "document_logs_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shared_link" ADD CONSTRAINT "document_shared_link_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shared_link" ADD CONSTRAINT "document_shared_link_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploaded_by_employees_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_employees_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_employees_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reviews" ADD CONSTRAINT "task_reviews_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reviews" ADD CONSTRAINT "task_reviews_submission_id_task_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."task_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_reviews" ADD CONSTRAINT "task_reviews_reviewed_by_employees_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_submitted_by_employees_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_employees_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_by_employees_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_messages" ADD CONSTRAINT "task_messages_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_messages" ADD CONSTRAINT "task_messages_sender_id_employees_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_label_assignments" ADD CONSTRAINT "task_label_assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_label_assignments" ADD CONSTRAINT "task_label_assignments_label_id_task_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."task_labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_user_id_employees_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allowances" ADD CONSTRAINT "allowances_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allowances" ADD CONSTRAINT "allowances_updated_by_employees_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deductions" ADD CONSTRAINT "deductions_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deductions" ADD CONSTRAINT "deductions_updated_by_employees_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_allowances" ADD CONSTRAINT "employee_allowances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_allowances" ADD CONSTRAINT "employee_allowances_allowance_id_allowances_id_fk" FOREIGN KEY ("allowance_id") REFERENCES "public"."allowances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_deductions" ADD CONSTRAINT "employee_deductions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_deductions" ADD CONSTRAINT "employee_deductions_salary_structure_id_salary_structure_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structure"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_salary" ADD CONSTRAINT "employee_salary_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_salary" ADD CONSTRAINT "employee_salary_salary_structure_id_salary_structure_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun" ADD CONSTRAINT "payrun_allowance_id_allowances_id_fk" FOREIGN KEY ("allowance_id") REFERENCES "public"."allowances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun" ADD CONSTRAINT "payrun_generated_by_employees_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun" ADD CONSTRAINT "payrun_approved_by_employees_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun" ADD CONSTRAINT "payrun_completed_by_employees_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun_item_details" ADD CONSTRAINT "payrun_item_details_payrun_item_id_payrun_items_id_fk" FOREIGN KEY ("payrun_item_id") REFERENCES "public"."payrun_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun_item_details" ADD CONSTRAINT "payrun_item_details_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun_item_details" ADD CONSTRAINT "payrun_item_details_allowance_id_allowances_id_fk" FOREIGN KEY ("allowance_id") REFERENCES "public"."allowances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun_item_details" ADD CONSTRAINT "payrun_item_details_deduction_id_deductions_id_fk" FOREIGN KEY ("deduction_id") REFERENCES "public"."deductions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun_item_details" ADD CONSTRAINT "payrun_item_details_employee_allowance_id_employee_allowances_id_fk" FOREIGN KEY ("employee_allowance_id") REFERENCES "public"."employee_allowances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun_item_details" ADD CONSTRAINT "payrun_item_details_employee_deduction_id_employee_deductions_id_fk" FOREIGN KEY ("employee_deduction_id") REFERENCES "public"."employee_deductions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun_items" ADD CONSTRAINT "payrun_items_payrun_id_payrun_id_fk" FOREIGN KEY ("payrun_id") REFERENCES "public"."payrun"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun_items" ADD CONSTRAINT "payrun_items_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_item_id_payrun_items_id_fk" FOREIGN KEY ("payroll_item_id") REFERENCES "public"."payrun_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_allowances" ADD CONSTRAINT "salary_allowances_salary_structure_id_salary_structure_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structure"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_allowances" ADD CONSTRAINT "salary_allowances_allowance_id_allowances_id_fk" FOREIGN KEY ("allowance_id") REFERENCES "public"."allowances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_deductions" ADD CONSTRAINT "salary_deductions_salary_structure_id_salary_structure_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structure"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_deductions" ADD CONSTRAINT "salary_deductions_deduction_id_deductions_id_fk" FOREIGN KEY ("deduction_id") REFERENCES "public"."deductions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structure" ADD CONSTRAINT "salary_structure_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structure" ADD CONSTRAINT "salary_structure_updated_by_employees_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_employees_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_hr_questions" ADD CONSTRAINT "ask_hr_questions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_hr_questions" ADD CONSTRAINT "ask_hr_questions_redirected_to_employees_id_fk" FOREIGN KEY ("redirected_to") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_hr_responses" ADD CONSTRAINT "ask_hr_responses_question_id_ask_hr_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."ask_hr_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_hr_responses" ADD CONSTRAINT "ask_hr_responses_respondent_id_employees_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_loan_type_id_loan_types_id_fk" FOREIGN KEY ("loan_type_id") REFERENCES "public"."loan_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_hr_reviewed_by_employees_id_fk" FOREIGN KEY ("hr_reviewed_by") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_disbursed_by_employees_id_fk" FOREIGN KEY ("disbursed_by") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_employee_deduction_id_employee_deductions_id_fk" FOREIGN KEY ("employee_deduction_id") REFERENCES "public"."employee_deductions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_history" ADD CONSTRAINT "loan_history_loan_application_id_loan_applications_id_fk" FOREIGN KEY ("loan_application_id") REFERENCES "public"."loan_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_history" ADD CONSTRAINT "loan_history_performed_by_employees_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_loan_application_id_loan_applications_id_fk" FOREIGN KEY ("loan_application_id") REFERENCES "public"."loan_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_type_salary_structures" ADD CONSTRAINT "loan_type_salary_structures_loan_type_id_loan_types_id_fk" FOREIGN KEY ("loan_type_id") REFERENCES "public"."loan_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_type_salary_structures" ADD CONSTRAINT "loan_type_salary_structures_salary_structure_id_salary_structure_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structure"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_types" ADD CONSTRAINT "loan_types_created_by_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_types" ADD CONSTRAINT "loan_types_updated_by_employees_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_author_id_employees_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_attachments" ADD CONSTRAINT "news_attachments_article_id_news_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."news_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_comments" ADD CONSTRAINT "news_comments_article_id_news_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."news_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_comments" ADD CONSTRAINT "news_comments_user_id_employees_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_report_attachments" ADD CONSTRAINT "bug_report_attachments_bug_report_id_bug_reports_id_fk" FOREIGN KEY ("bug_report_id") REFERENCES "public"."bug_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_accounts_userId" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_userId" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_token" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "auth_users_email" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "auth_verification_identifier" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "attendance_employee_date_idx" ON "attendance" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "employee_manager_idx" ON "employees" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "employees_department_role_idx" ON "employees" USING btree ("department","role");--> statement-breakpoint
CREATE INDEX "history_employee_idx" ON "employment_history" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employment_history_active_idx" ON "employment_history" USING btree ("end_date") WHERE end_date IS NULL;--> statement-breakpoint
CREATE INDEX "leave_applications_employee_idx" ON "leave_applications" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "leave_applications_status_idx" ON "leave_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leave_applications_dates_idx" ON "leave_applications" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "leave_balances_employee_idx" ON "leave_balances" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "leave_balances_type_year_idx" ON "leave_balances" USING btree ("leave_type","year");--> statement-breakpoint
CREATE INDEX "email_sender_id_idx" ON "email" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "email_created_at_idx" ON "email" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_parent_email_id_idx" ON "email" USING btree ("parent_email_id");--> statement-breakpoint
CREATE INDEX "email_attachment_email_id_idx" ON "email_attachment" USING btree ("email_id");--> statement-breakpoint
CREATE INDEX "email_attachment_document_id_idx" ON "email_attachment" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "email_recipient_email_id_idx" ON "email_recipient" USING btree ("email_id");--> statement-breakpoint
CREATE INDEX "email_recipient_recipient_id_idx" ON "email_recipient" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "email_recipient_external_email_idx" ON "email_recipient" USING btree ("external_email");--> statement-breakpoint
CREATE INDEX "email_recipient_is_read_idx" ON "email_recipient" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "email_recipient_is_archived_idx" ON "email_recipient" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "email_recipient_is_deleted_idx" ON "email_recipient" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "expenses_project_idx" ON "expenses" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "milestones_project_idx" ON "milestones" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_project_idx" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_employee_idx" ON "project_members" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "projects_supervisor_idx" ON "projects" USING btree ("supervisor_id");--> statement-breakpoint
CREATE INDEX "projects_contractor_idx" ON "projects" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "projects_creator_idx" ON "projects" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "documents_name_idx" ON "document" USING btree ("title");--> statement-breakpoint
CREATE INDEX "documents_version_id_idx" ON "document" USING btree ("current_version_id");--> statement-breakpoint
CREATE INDEX "documents_access_id_idx" ON "document_access" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "documents_access_level_idx" ON "document_access" USING btree ("access_level");--> statement-breakpoint
CREATE INDEX "documents_access_granted_idx" ON "document_access" USING btree ("granted_by");--> statement-breakpoint
CREATE INDEX "documents_access_department_idx" ON "document_access" USING btree ("department");--> statement-breakpoint
CREATE INDEX "documents_access_user_idx" ON "document_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_comment_idx" ON "document_comments" USING btree ("comment");--> statement-breakpoint
CREATE INDEX "folders_name_idx" ON "document_folders" USING btree ("name");--> statement-breakpoint
CREATE INDEX "folders_department_idx" ON "document_folders" USING btree ("department");--> statement-breakpoint
CREATE INDEX "folders_parent_idx" ON "document_folders" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "documents_logs_action_idx" ON "document_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "documents_logs_document_idx" ON "document_logs" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "documents_shared_token" ON "document_shared_link" USING btree ("token");--> statement-breakpoint
CREATE INDEX "documents_tag_idx" ON "document_tags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "documents_tag_id_idx" ON "document_tags" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "documents_version_number_idx" ON "document_versions" USING btree ("version_number");--> statement-breakpoint
CREATE INDEX "documents_version_uploaded_by_idx" ON "document_versions" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "documents_version_ocr_idx" ON "document_versions" USING btree ("scanned_ocr");--> statement-breakpoint
CREATE INDEX "task_reviews_task_idx" ON "task_reviews" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_reviews_submission_idx" ON "task_reviews" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "task_reviews_reviewer_idx" ON "task_reviews" USING btree ("reviewed_by");--> statement-breakpoint
CREATE INDEX "task_submissions_task_idx" ON "task_submissions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_submissions_employee_idx" ON "task_submissions" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "tasks_assigned_to_idx" ON "tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "tasks_assigned_by_idx" ON "tasks" USING btree ("assigned_by");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_assignees_task_idx" ON "task_assignees" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_assignees_employee_idx" ON "task_assignees" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "task_label_assignments_task_idx" ON "task_label_assignments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_label_assignments_label_idx" ON "task_label_assignments" USING btree ("label_id");--> statement-breakpoint
CREATE INDEX "balance_transactions_user_idx" ON "balance_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "balance_transactions_date_idx" ON "balance_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "balance_transactions_type_idx" ON "balance_transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "company_expenses_date_idx" ON "company_expenses" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "allowance_amount_idx" ON "allowances" USING btree ("amount");--> statement-breakpoint
CREATE INDEX "employee_allowance_id_idx" ON "employee_allowances" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_allowance_active_idx" ON "employee_allowances" USING btree ("employee_id","allowance_id") WHERE effective_to IS NULL;--> statement-breakpoint
CREATE INDEX "emp_deduction_employee_idx" ON "employee_deductions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_salary_active_idx" ON "employee_salary" USING btree ("employee_id") WHERE effective_to IS NULL;--> statement-breakpoint
CREATE INDEX "employee_salary_employee_idx" ON "employee_salary" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payrun_status_idx" ON "payrun" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payrun_date_idx" ON "payrun" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "payrun_type_idx" ON "payrun" USING btree ("type");--> statement-breakpoint
CREATE INDEX "payroll_item_details_payroll_item_idx" ON "payrun_item_details" USING btree ("payrun_item_id");--> statement-breakpoint
CREATE INDEX "payroll_item_details_employee_idx" ON "payrun_item_details" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payroll_item_details_type_idx" ON "payrun_item_details" USING btree ("detail_type");--> statement-breakpoint
CREATE INDEX "payroll_item_details_allowance_idx" ON "payrun_item_details" USING btree ("allowance_id");--> statement-breakpoint
CREATE INDEX "payroll_item_details_deduction_idx" ON "payrun_item_details" USING btree ("deduction_id");--> statement-breakpoint
CREATE INDEX "payrun_items_employee_idx" ON "payrun_items" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payrun_items_run_idx" ON "payrun_items" USING btree ("payrun_id");--> statement-breakpoint
CREATE INDEX "payroll_items_status_idx" ON "payrun_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "salary_allowance_id_idx" ON "salary_allowances" USING btree ("salary_structure_id");--> statement-breakpoint
CREATE INDEX "salary_deduction_table_id_idx" ON "salary_deductions" USING btree ("salary_structure_id");--> statement-breakpoint
CREATE INDEX "payroll_amount_idx" ON "salary_structure" USING btree ("base_salary");--> statement-breakpoint
CREATE INDEX "ask_hr_questions_employee_idx" ON "ask_hr_questions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "ask_hr_questions_status_idx" ON "ask_hr_questions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ask_hr_questions_category_idx" ON "ask_hr_questions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ask_hr_questions_redirected_to_idx" ON "ask_hr_questions" USING btree ("redirected_to");--> statement-breakpoint
CREATE INDEX "ask_hr_responses_question_idx" ON "ask_hr_responses" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "ask_hr_responses_respondent_idx" ON "ask_hr_responses" USING btree ("respondent_id");--> statement-breakpoint
CREATE INDEX "loan_app_employee_idx" ON "loan_applications" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "loan_app_type_idx" ON "loan_applications" USING btree ("loan_type_id");--> statement-breakpoint
CREATE INDEX "loan_app_status_idx" ON "loan_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "loan_app_reference_idx" ON "loan_applications" USING btree ("reference_number");--> statement-breakpoint
CREATE INDEX "loan_app_hr_reviewed_idx" ON "loan_applications" USING btree ("hr_reviewed_by");--> statement-breakpoint
CREATE INDEX "loan_app_disbursed_idx" ON "loan_applications" USING btree ("disbursed_by");--> statement-breakpoint
CREATE INDEX "loan_app_active_idx" ON "loan_applications" USING btree ("employee_id","status") WHERE status IN ('active', 'disbursed', 'hr_approved', 'pending');--> statement-breakpoint
CREATE INDEX "loan_history_loan_idx" ON "loan_history" USING btree ("loan_application_id");--> statement-breakpoint
CREATE INDEX "loan_history_action_idx" ON "loan_history" USING btree ("action");--> statement-breakpoint
CREATE INDEX "loan_history_date_idx" ON "loan_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "loan_repayment_loan_idx" ON "loan_repayments" USING btree ("loan_application_id");--> statement-breakpoint
CREATE INDEX "loan_repayment_employee_idx" ON "loan_repayments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "loan_repayment_status_idx" ON "loan_repayments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "loan_repayment_due_idx" ON "loan_repayments" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "loan_type_structure_loan_idx" ON "loan_type_salary_structures" USING btree ("loan_type_id");--> statement-breakpoint
CREATE INDEX "loan_type_structure_salary_idx" ON "loan_type_salary_structures" USING btree ("salary_structure_id");--> statement-breakpoint
CREATE INDEX "loan_type_active_idx" ON "loan_types" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "loan_type_name_idx" ON "loan_types" USING btree ("name");