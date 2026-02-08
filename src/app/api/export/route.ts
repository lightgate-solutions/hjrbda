import { auth } from "@/lib/auth";
import { db } from "@/db";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { createObjectCsvStringifier } from "csv-writer";
import {
  employees,
  employeesDocuments,
  attendance,
  employeesBank,
  leaveApplications,
  leaveBalances,
} from "@/db/schema/hr";
import { projects } from "@/db/schema/projects";
import { document, documentLogs } from "@/db/schema/documents";
import { newsArticles } from "@/db/schema/news";
import { user, session } from "@/db/schema/auth";
import { askHrQuestions } from "@/db/schema/ask-hr";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

type ExportDataset =
  | "employees"
  | "news"
  | "projects"
  | "projects-pending"
  | "projects-in-progress"
  | "projects-completed"
  | "user-sessions"
  | "users"
  | "documents"
  | "document-logs"
  | "attendance"
  | "leave-applications"
  | "leave-balances"
  | "ask-hr"
  | "employee-banks"
  | "employee-documents";

export async function GET(request: NextRequest) {
  try {
    const authSession = await auth.api.getSession({
      headers: await headers(),
    });

    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = authSession.user.role?.toLowerCase().trim();
    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const dataset = searchParams.get("dataset") as ExportDataset;
    const format = searchParams.get("format") || "csv";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!dataset) {
      return NextResponse.json(
        { error: "Dataset parameter is required" },
        { status: 400 },
      );
    }

    const dateFilters = {
      start: startDate ? new Date(startDate) : undefined,
      end: endDate ? new Date(endDate) : undefined,
    };

    const {
      data,
      headers: csvHeaders,
      filename,
    } = await fetchDataset(dataset, dateFilters);

    if (format === "json") {
      return NextResponse.json({ data, count: data.length });
    }

    // CSV format
    const csvStringifier = createObjectCsvStringifier({
      header: csvHeaders.map((h) => ({ id: h.id, title: h.title })),
    });

    const csv =
      csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(data);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to export data" },
      { status: 500 },
    );
  }
}

async function fetchDataset(
  dataset: ExportDataset,
  dateFilters: { start?: Date; end?: Date },
) {
  // Create aliases for joins
  const manager = alias(employees, "manager");
  const approver = alias(employees, "approver");
  const supervisor = alias(employees, "supervisor");
  const uploader = alias(employees, "uploader");
  switch (dataset) {
    case "employees": {
      const data = await db
        .select({
          name: employees.name,
          email: employees.email,
          phone: employees.phone,
          staffNumber: employees.staffNumber,
          role: employees.role,
          department: employees.department,
          status: employees.status,
          employmentType: employees.employmentType,
          maritalStatus: employees.maritalStatus,
          dateOfBirth: employees.dateOfBirth,
          address: employees.address,
          isManager: employees.isManager,
          managerName: manager.name,
          createdAt: employees.createdAt,
        })
        .from(employees)
        .leftJoin(manager, eq(employees.managerId, manager.id))
        .orderBy(desc(employees.createdAt));

      return {
        data: data.map((e) => ({
          ...e,
          isManager: e.isManager ? "Yes" : "No",
          createdAt: e.createdAt?.toISOString().split("T")[0],
        })),
        headers: [
          { id: "name", title: "Name" },
          { id: "email", title: "Email" },
          { id: "phone", title: "Phone" },
          { id: "staffNumber", title: "Staff Number" },
          { id: "role", title: "Role" },
          { id: "department", title: "Department" },
          { id: "status", title: "Status" },
          { id: "employmentType", title: "Employment Type" },
          { id: "maritalStatus", title: "Marital Status" },
          { id: "dateOfBirth", title: "Date of Birth" },
          { id: "address", title: "Address" },
          { id: "isManager", title: "Is Manager" },
          { id: "managerName", title: "Manager" },
          { id: "createdAt", title: "Created At" },
        ],
        filename: "employees_export",
      };
    }

    case "news": {
      const baseQuery = db
        .select({
          title: newsArticles.title,
          excerpt: newsArticles.excerpt,
          authorName: employees.name,
          status: newsArticles.status,
          viewCount: newsArticles.viewCount,
          commentsEnabled: newsArticles.commentsEnabled,
          isPinned: newsArticles.isPinned,
          publishedAt: newsArticles.publishedAt,
          createdAt: newsArticles.createdAt,
        })
        .from(newsArticles)
        .leftJoin(employees, eq(newsArticles.authorId, employees.id));

      const conditions = [];
      if (dateFilters.start && dateFilters.end) {
        conditions.push(gte(newsArticles.createdAt, dateFilters.start));
        conditions.push(lte(newsArticles.createdAt, dateFilters.end));
      }

      const query =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

      const data = await query.orderBy(desc(newsArticles.createdAt));

      return {
        data: data.map((n) => ({
          ...n,
          commentsEnabled: n.commentsEnabled ? "Yes" : "No",
          isPinned: n.isPinned ? "Yes" : "No",
          publishedAt: n.publishedAt?.toISOString().split("T")[0],
          createdAt: n.createdAt?.toISOString().split("T")[0],
        })),
        headers: [
          { id: "title", title: "Title" },
          { id: "excerpt", title: "Excerpt" },
          { id: "authorName", title: "Author" },
          { id: "status", title: "Status" },
          { id: "viewCount", title: "View Count" },
          { id: "commentsEnabled", title: "Comments Enabled" },
          { id: "isPinned", title: "Is Pinned" },
          { id: "publishedAt", title: "Published At" },
          { id: "createdAt", title: "Created At" },
        ],
        filename: "news_articles_export",
      };
    }

    case "projects":
    case "projects-pending":
    case "projects-in-progress":
    case "projects-completed": {
      const baseQuery = db
        .select({
          name: projects.name,
          code: projects.code,
          description: projects.description,
          location: projects.location,
          status: projects.status,
          budgetPlanned: projects.budgetPlanned,
          budgetActual: projects.budgetActual,
          supervisorName: supervisor.name,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .leftJoin(supervisor, eq(projects.supervisorId, supervisor.id));

      const conditions = [];

      if (dataset === "projects-pending") {
        conditions.push(eq(projects.status, "pending"));
      } else if (dataset === "projects-in-progress") {
        conditions.push(eq(projects.status, "in-progress"));
      } else if (dataset === "projects-completed") {
        conditions.push(eq(projects.status, "completed"));
      }

      if (dateFilters.start && dateFilters.end) {
        conditions.push(gte(projects.createdAt, dateFilters.start));
        conditions.push(lte(projects.createdAt, dateFilters.end));
      }

      const query =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

      const data = await query.orderBy(desc(projects.createdAt));

      return {
        data: data.map((p) => ({
          ...p,
          budgetPlanned: p.budgetPlanned?.toString(),
          budgetActual: p.budgetActual?.toString(),
          createdAt: p.createdAt?.toISOString().split("T")[0],
        })),
        headers: [
          { id: "name", title: "Name" },
          { id: "code", title: "Code" },
          { id: "description", title: "Description" },
          { id: "location", title: "Location" },
          { id: "status", title: "Status" },
          { id: "budgetPlanned", title: "Budget Planned" },
          { id: "budgetActual", title: "Budget Actual" },
          { id: "supervisorName", title: "Supervisor" },
          { id: "createdAt", title: "Created At" },
        ],
        filename: `projects_${dataset.replace("projects-", "") || "all"}_export`,
      };
    }

    case "users": {
      const data = await db
        .select({
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          role: user.role,
          banned: user.banned,
          createdAt: user.createdAt,
        })
        .from(user)
        .orderBy(desc(user.createdAt));

      return {
        data: data.map((u) => ({
          ...u,
          emailVerified: u.emailVerified ? "Yes" : "No",
          banned: u.banned ? "Yes" : "No",
          createdAt: u.createdAt?.toISOString().split("T")[0],
        })),
        headers: [
          { id: "name", title: "Name" },
          { id: "email", title: "Email" },
          { id: "emailVerified", title: "Email Verified" },
          { id: "role", title: "Role" },
          { id: "banned", title: "Banned" },
          { id: "createdAt", title: "Created At" },
        ],
        filename: "users_export",
      };
    }

    case "user-sessions": {
      const baseQuery = db
        .select({
          userName: user.name,
          userEmail: user.email,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
        })
        .from(session)
        .leftJoin(user, eq(session.userId, user.id));

      const conditions = [];
      if (dateFilters.start && dateFilters.end) {
        conditions.push(gte(session.createdAt, dateFilters.start));
        conditions.push(lte(session.createdAt, dateFilters.end));
      }

      const query =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

      const data = await query.orderBy(desc(session.createdAt));

      return {
        data: data.map((s) => ({
          ...s,
          createdAt: s.createdAt?.toISOString(),
          expiresAt: s.expiresAt?.toISOString(),
        })),
        headers: [
          { id: "userName", title: "User" },
          { id: "userEmail", title: "Email" },
          { id: "ipAddress", title: "IP Address" },
          { id: "userAgent", title: "User Agent" },
          { id: "createdAt", title: "Login Time" },
          { id: "expiresAt", title: "Expires At" },
        ],
        filename: "user_sessions_export",
      };
    }

    case "documents": {
      const baseQuery = db
        .select({
          title: document.title,
          description: document.description,
          department: document.department,
          currentVersion: document.currentVersion,
          public: document.public,
          uploadedByName: uploader.name,
          status: document.status,
          createdAt: document.createdAt,
        })
        .from(document)
        .leftJoin(uploader, eq(document.uploadedBy, uploader.id));

      const conditions = [];
      if (dateFilters.start && dateFilters.end) {
        conditions.push(gte(document.createdAt, dateFilters.start));
        conditions.push(lte(document.createdAt, dateFilters.end));
      }

      const query =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

      const data = await query.orderBy(desc(document.createdAt));

      return {
        data: data.map((d) => ({
          ...d,
          public: d.public ? "Yes" : "No",
          createdAt: d.createdAt?.toISOString().split("T")[0],
        })),
        headers: [
          { id: "title", title: "Title" },
          { id: "description", title: "Description" },
          { id: "department", title: "Department" },
          { id: "currentVersion", title: "Current Version" },
          { id: "public", title: "Public" },
          { id: "uploadedByName", title: "Uploaded By" },
          { id: "status", title: "Status" },
          { id: "createdAt", title: "Created At" },
        ],
        filename: "documents_export",
      };
    }

    case "document-logs": {
      const logUser = alias(user, "logUser");
      const baseQuery = db
        .select({
          userName: logUser.name,
          documentTitle: document.title,
          action: documentLogs.action,
          details: documentLogs.details,
          createdAt: documentLogs.createdAt,
        })
        .from(documentLogs)
        .leftJoin(logUser, eq(documentLogs.userId, logUser.id))
        .leftJoin(document, eq(documentLogs.documentId, document.id));

      const conditions = [];
      if (dateFilters.start && dateFilters.end) {
        conditions.push(gte(documentLogs.createdAt, dateFilters.start));
        conditions.push(lte(documentLogs.createdAt, dateFilters.end));
      }

      const query =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

      const data = await query.orderBy(desc(documentLogs.createdAt));

      return {
        data: data.map((dl) => ({
          ...dl,
          createdAt: dl.createdAt?.toISOString(),
        })),
        headers: [
          { id: "userName", title: "User" },
          { id: "documentTitle", title: "Document" },
          { id: "action", title: "Action" },
          { id: "details", title: "Details" },
          { id: "createdAt", title: "Created At" },
        ],
        filename: "document_logs_export",
      };
    }

    case "attendance": {
      const baseQuery = db
        .select({
          employeeName: employees.name,
          date: attendance.date,
          time: attendance.signInTime,
          signOutTime: attendance.signOutTime,
          checkedIn: sql<boolean>`(${attendance.signInTime} IS NOT NULL)`.as(
            "checkedIn",
          ),
          createdAt: attendance.createdAt,
        })
        .from(attendance)
        .leftJoin(employees, eq(attendance.employeeId, employees.id));

      const conditions = [];
      if (dateFilters.start && dateFilters.end) {
        conditions.push(
          gte(attendance.date, dateFilters.start.toISOString().split("T")[0]),
        );
        conditions.push(
          lte(attendance.date, dateFilters.end.toISOString().split("T")[0]),
        );
      }

      const query =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

      const data = await query.orderBy(desc(attendance.date));

      return {
        data: data.map((a) => ({
          ...a,
          checkedIn: a.checkedIn ? "Yes" : "No",
          createdAt: a.createdAt?.toISOString().split("T")[0],
        })),
        headers: [
          { id: "employeeName", title: "Employee" },
          { id: "date", title: "Date" },
          { id: "time", title: "Check In Time" },
          { id: "signOutTime", title: "Sign Out Time" },
          { id: "checkedIn", title: "Checked In" },
          { id: "approvedByName", title: "Approved By" },
          { id: "createdAt", title: "Created At" },
        ],
        filename: "attendance_export",
      };
    }

    case "leave-applications": {
      const baseQuery = db
        .select({
          employeeName: employees.name,
          leaveType: leaveApplications.leaveType,
          startDate: leaveApplications.startDate,
          endDate: leaveApplications.endDate,
          totalDays: leaveApplications.totalDays,
          reason: leaveApplications.reason,
          status: leaveApplications.status,
          approvedByName: approver.name,
          appliedAt: leaveApplications.appliedAt,
        })
        .from(leaveApplications)
        .leftJoin(employees, eq(leaveApplications.employeeId, employees.id))
        .leftJoin(approver, eq(leaveApplications.approvedBy, approver.id));

      const conditions = [];
      if (dateFilters.start && dateFilters.end) {
        conditions.push(gte(leaveApplications.appliedAt, dateFilters.start));
        conditions.push(lte(leaveApplications.appliedAt, dateFilters.end));
      }

      const query =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

      const data = await query.orderBy(desc(leaveApplications.appliedAt));

      return {
        data: data.map((la) => ({
          ...la,
          appliedAt: la.appliedAt?.toISOString().split("T")[0],
        })),
        headers: [
          { id: "employeeName", title: "Employee" },
          { id: "leaveType", title: "Leave Type" },
          { id: "startDate", title: "Start Date" },
          { id: "endDate", title: "End Date" },
          { id: "totalDays", title: "Total Days" },
          { id: "reason", title: "Reason" },
          { id: "status", title: "Status" },
          { id: "approvedByName", title: "Approved By" },
          { id: "appliedAt", title: "Applied At" },
        ],
        filename: "leave_applications_export",
      };
    }

    case "leave-balances": {
      const data = await db
        .select({
          employeeName: employees.name,
          leaveType: leaveBalances.leaveType,
          totalDays: leaveBalances.totalDays,
          usedDays: leaveBalances.usedDays,
          remainingDays: leaveBalances.remainingDays,
          year: leaveBalances.year,
          createdAt: leaveBalances.createdAt,
        })
        .from(leaveBalances)
        .leftJoin(employees, eq(leaveBalances.employeeId, employees.id))
        .orderBy(desc(leaveBalances.createdAt));

      return {
        data: data.map((lb) => ({
          ...lb,
          createdAt: lb.createdAt?.toISOString().split("T")[0],
        })),
        headers: [
          { id: "employeeName", title: "Employee" },
          { id: "leaveType", title: "Leave Type" },
          { id: "totalDays", title: "Total Days" },
          { id: "usedDays", title: "Used Days" },
          { id: "remainingDays", title: "Remaining Days" },
          { id: "year", title: "Year" },
          { id: "createdAt", title: "Created At" },
        ],
        filename: "leave_balances_export",
      };
    }

    case "ask-hr": {
      const baseQuery = db
        .select({
          employeeName: employees.name,
          title: askHrQuestions.title,
          question: askHrQuestions.question,
          category: askHrQuestions.category,
          status: askHrQuestions.status,
          isAnonymous: askHrQuestions.isAnonymous,
          isPublic: askHrQuestions.isPublic,
          createdAt: askHrQuestions.createdAt,
        })
        .from(askHrQuestions)
        .leftJoin(employees, eq(askHrQuestions.employeeId, employees.id));

      const conditions = [];
      if (dateFilters.start && dateFilters.end) {
        conditions.push(gte(askHrQuestions.createdAt, dateFilters.start));
        conditions.push(lte(askHrQuestions.createdAt, dateFilters.end));
      }

      const query =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

      const data = await query.orderBy(desc(askHrQuestions.createdAt));

      return {
        data: data.map((q) => ({
          ...q,
          employeeName: q.isAnonymous ? "Anonymous" : q.employeeName,
          isAnonymous: q.isAnonymous ? "Yes" : "No",
          isPublic: q.isPublic ? "Yes" : "No",
          createdAt: q.createdAt?.toISOString().split("T")[0],
        })),
        headers: [
          { id: "employeeName", title: "Employee" },
          { id: "title", title: "Title" },
          { id: "question", title: "Question" },
          { id: "category", title: "Category" },
          { id: "status", title: "Status" },
          { id: "isAnonymous", title: "Is Anonymous" },
          { id: "isPublic", title: "Is Public" },
          { id: "createdAt", title: "Created At" },
        ],
        filename: "ask_hr_questions_export",
      };
    }

    case "employee-banks": {
      const data = await db
        .select({
          employeeName: employees.name,
          bankName: employeesBank.bankName,
          accountName: employeesBank.accountName,
          accountNumber: employeesBank.accountNumber,
          createdAt: employeesBank.createdAt,
        })
        .from(employeesBank)
        .leftJoin(employees, eq(employeesBank.employeeId, employees.id))
        .orderBy(desc(employeesBank.createdAt));

      return {
        data: data.map((eb) => ({
          ...eb,
          createdAt: eb.createdAt?.toISOString().split("T")[0],
        })),
        headers: [
          { id: "employeeName", title: "Employee" },
          { id: "bankName", title: "Bank Name" },
          { id: "accountName", title: "Account Name" },
          { id: "accountNumber", title: "Account Number" },
          { id: "createdAt", title: "Created At" },
        ],
        filename: "employee_banks_export",
      };
    }

    case "employee-documents": {
      const baseQuery = db
        .select({
          employeeName: employees.name,
          documentType: employeesDocuments.documentType,
          documentName: employeesDocuments.documentName,
          fileSize: employeesDocuments.fileSize,
          mimeType: employeesDocuments.mimeType,
          department: employeesDocuments.department,
          uploadedByName: uploader.name,
          createdAt: employeesDocuments.createdAt,
        })
        .from(employeesDocuments)
        .leftJoin(employees, eq(employeesDocuments.employeeId, employees.id))
        .leftJoin(uploader, eq(employeesDocuments.uploadedBy, uploader.id));

      const conditions = [];
      if (dateFilters.start && dateFilters.end) {
        conditions.push(gte(employeesDocuments.createdAt, dateFilters.start));
        conditions.push(lte(employeesDocuments.createdAt, dateFilters.end));
      }

      const query =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

      const data = await query.orderBy(desc(employeesDocuments.createdAt));

      return {
        data: data.map((ed) => ({
          ...ed,
          createdAt: ed.createdAt?.toISOString().split("T")[0],
        })),
        headers: [
          { id: "employeeName", title: "Employee" },
          { id: "documentType", title: "Document Type" },
          { id: "documentName", title: "Document Name" },
          { id: "fileSize", title: "File Size" },
          { id: "mimeType", title: "MIME Type" },
          { id: "department", title: "Department" },
          { id: "uploadedByName", title: "Uploaded By" },
          { id: "createdAt", title: "Created At" },
        ],
        filename: "employee_documents_export",
      };
    }

    default:
      throw new Error(`Unknown dataset: ${dataset}`);
  }
}
