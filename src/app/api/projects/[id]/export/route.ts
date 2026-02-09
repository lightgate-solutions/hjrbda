import { type NextRequest, NextResponse } from "next/server";
import { createObjectCsvStringifier } from "csv-writer";
import { getOrganization } from "@/actions/organization";
import { addPdfHeader } from "@/lib/pdf-utils";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/actions/auth/dal";
import { checkProjectAccess } from "@/lib/project-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number.parseInt(id, 10);

    if (Number.isNaN(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const isAdmin =
      user.role.toLowerCase() === "admin" ||
      user.department.toLowerCase() === "admin";

    // Check access
    const hasAccess = await checkProjectAccess(projectId, user.id, isAdmin);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this project" },
        { status: 403 },
      );
    }

    // Get project with all related data
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: {
        supervisor: {
          columns: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        contractor: {
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        creator: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          with: {
            employee: {
              columns: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
              },
            },
          },
        },
        milestones: {
          orderBy: (milestones, { asc }) => [asc(milestones.dueDate)],
        },
        expenses: {
          orderBy: (expenses, { desc }) => [desc(expenses.spentAt)],
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Calculate metrics
    const totalExpenses = project.expenses.reduce(
      (sum, exp) => sum + (exp.amount ?? 0),
      0,
    );
    const remainingBudget = (project.budgetPlanned ?? 0) - totalExpenses;
    const completedMilestones = project.milestones.filter(
      (m) => m.completed,
    ).length;
    const totalMilestones = project.milestones.length;
    const progressPercentage =
      totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0;

    const data = {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        description: project.description,
        street: project.street,
        city: project.city,
        state: project.state,
        status: project.status,
        budgetPlanned: project.budgetPlanned,
        budgetActual: project.budgetActual,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      supervisor: project.supervisor,
      contractor: project.contractor,
      creator: project.creator,
      members: project.members.map((m) => m.employee),
      milestones: project.milestones,
      expenses: project.expenses,
      metrics: {
        totalExpenses,
        remainingBudget,
        completedMilestones,
        totalMilestones,
        progressPercentage,
      },
    };

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "csv";

    if (format === "pdf") {
      return await generatePDF(data);
    }

    return generateCSV(data);
  } catch (error) {
    console.error("Export error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to export project data";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

type ExportData = {
  project: {
    id: number;
    name: string;
    code: string;
    description: string | null;
    street: string;
    city: string;
    state: string;
    status: string;
    budgetPlanned: number | null;
    budgetActual: number | null;
    createdAt: Date;
    updatedAt: Date;
  };
  supervisor: {
    id: number;
    name: string;
    email: string;
    department: string;
  } | null;
  contractor: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  creator: { id: number; name: string; email: string | null } | null;
  members: {
    id: number;
    name: string;
    email: string | null;
    role: string | null;
    department: string | null;
  }[];
  milestones: {
    title: string;
    description: string | null;
    dueDate: Date | string | null;
    completed: number;
  }[];
  expenses: {
    title: string;
    amount: number | null;
    spentAt: Date | string | null;
    notes: string | null;
  }[];
  metrics: {
    totalExpenses: number;
    remainingBudget: number;
    completedMilestones: number;
    totalMilestones: number;
    progressPercentage: number;
  };
};

function generateCSV(data: ExportData) {
  const rows: Record<string, string | number | undefined>[] = [];

  // Project Overview Section
  rows.push({
    section: "PROJECT OVERVIEW",
    field: "",
    value: "",
  });
  rows.push({
    section: "",
    field: "Project Name",
    value: data.project.name,
  });
  rows.push({ section: "", field: "Project Code", value: data.project.code });
  rows.push({
    section: "",
    field: "Description",
    value: data.project.description || "N/A",
  });
  rows.push({
    section: "",
    field: "Location",
    value:
      [data.project.street, data.project.city, data.project.state]
        .filter(Boolean)
        .join(", ") || "N/A",
  });
  rows.push({ section: "", field: "Status", value: data.project.status });
  rows.push({
    section: "",
    field: "Supervisor",
    value: data.supervisor?.name || "N/A",
  });
  rows.push({
    section: "",
    field: "Contractor",
    value: data.contractor?.name || "N/A",
  });
  rows.push({
    section: "",
    field: "Budget Planned",
    value: data.project.budgetPlanned?.toString() || "0",
  });
  rows.push({
    section: "",
    field: "Budget Spent",
    value: data.metrics.totalExpenses.toString(),
  });
  rows.push({
    section: "",
    field: "Remaining Budget",
    value: data.metrics.remainingBudget.toString(),
  });
  rows.push({
    section: "",
    field: "Progress",
    value: `${data.metrics.progressPercentage}%`,
  });
  rows.push({ section: "", field: "", value: "" });

  // Members Section
  if (data.members.length > 0) {
    rows.push({ section: "PROJECT MEMBERS", field: "", value: "" });
    rows.push({ section: "", field: "Name", value: "Department" });
    for (const member of data.members) {
      rows.push({
        section: "",
        field: member.name,
        value: member.department || "N/A",
      });
    }
    rows.push({ section: "", field: "", value: "" });
  }

  // Milestones Section
  if (data.milestones.length > 0) {
    rows.push({ section: "MILESTONES", field: "", value: "" });
    rows.push({
      section: "",
      field: "Title",
      value: "Due Date",
      extra: "Status",
    });
    for (const milestone of data.milestones) {
      rows.push({
        section: "",
        field: milestone.title,
        value: milestone.dueDate
          ? new Date(milestone.dueDate).toLocaleDateString()
          : "N/A",
        extra: milestone.completed ? "Completed" : "Pending",
      });
    }
    rows.push({ section: "", field: "", value: "" });
  }

  // Expenses Section
  if (data.expenses.length > 0) {
    rows.push({ section: "EXPENSES", field: "", value: "" });
    rows.push({
      section: "",
      field: "Title",
      value: "Amount",
      extra: "Date",
    });
    for (const expense of data.expenses) {
      rows.push({
        section: "",
        field: expense.title,
        value: expense.amount?.toString() || "0",
        extra: expense.spentAt
          ? new Date(expense.spentAt).toLocaleDateString()
          : "N/A",
      });
    }
  }

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: "section", title: "Section" },
      { id: "field", title: "Field" },
      { id: "value", title: "Value" },
      { id: "extra", title: "Extra" },
      { id: "extra2", title: "Extra 2" },
    ],
  });

  const csv =
    csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${data.project.code}-${data.project.name.replace(/[^a-z0-9]/gi, "-")}-export.csv"`,
    },
  });
}

async function generatePDF(data: ExportData) {
  // Import jsPDF dynamically to avoid SSR issues
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const { success: org } = await getOrganization();
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Add header with logo
  let yPosition = await addPdfHeader(doc, {
    organizationName: org?.name || "HJRBDA",
    logoUrl: org?.logoUrl,
    documentTitle: data.project.name,
    subtitle: `Project Code: ${data.project.code}`,
    isServer: true,
  });

  yPosition += 10;

  // Project Overview
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Project Overview", 14, yPosition);
  yPosition += 7;

  autoTable(doc, {
    startY: yPosition,
    head: [["Field", "Value"]],
    body: [
      ["Description", data.project.description || "N/A"],
      [
        "Location",
        [data.project.street, data.project.city, data.project.state]
          .filter(Boolean)
          .join(", ") || "N/A",
      ],
      ["Status", data.project.status],
      ["Supervisor", data.supervisor?.name || "N/A"],
      ["Contractor", data.contractor?.name || "N/A"],
      [
        "Budget Planned",
        `$${data.project.budgetPlanned?.toLocaleString() || "0"}`,
      ],
      ["Budget Spent", `$${data.metrics.totalExpenses.toLocaleString()}`],
      ["Remaining Budget", `$${data.metrics.remainingBudget.toLocaleString()}`],
      ["Progress", `${data.metrics.progressPercentage}%`],
      [
        "Completed Milestones",
        `${data.metrics.completedMilestones}/${data.metrics.totalMilestones}`,
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 10 },
  });

  const docWithTable = doc as typeof doc & {
    lastAutoTable?: { finalY: number };
  };
  yPosition = (docWithTable.lastAutoTable?.finalY ?? yPosition) + 15;

  // Project Members
  if (data.members.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Project Members", 14, yPosition);
    yPosition += 7;

    autoTable(doc, {
      startY: yPosition,
      head: [["Name", "Role", "Department"]],
      body: data.members.map((member) => [
        member.name,
        member.role || "N/A",
        member.department || "N/A",
      ]),
      theme: "striped",
      headStyles: { fillColor: [52, 152, 219] },
      styles: { fontSize: 9 },
    });

    yPosition = (docWithTable.lastAutoTable?.finalY ?? yPosition) + 15;
  }

  // Milestones
  if (data.milestones.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Milestones", 14, yPosition);
    yPosition += 7;

    autoTable(doc, {
      startY: yPosition,
      head: [["Title", "Due Date", "Status"]],
      body: data.milestones.map((milestone) => [
        milestone.title,
        milestone.dueDate
          ? new Date(milestone.dueDate).toLocaleDateString()
          : "N/A",
        milestone.completed ? "✓ Completed" : "○ Pending",
      ]),
      theme: "striped",
      headStyles: { fillColor: [46, 204, 113] },
      styles: { fontSize: 9 },
    });

    yPosition = (docWithTable.lastAutoTable?.finalY ?? yPosition) + 15;
  }

  // Expenses
  if (data.expenses.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Expenses", 14, yPosition);
    yPosition += 7;

    autoTable(doc, {
      startY: yPosition,
      head: [["Title", "Amount", "Date", "Notes"]],
      body: data.expenses.map((expense) => [
        expense.title,
        `$${expense.amount?.toLocaleString() || "0"}`,
        expense.spentAt
          ? new Date(expense.spentAt).toLocaleDateString()
          : "N/A",
        expense.notes || "",
      ]),
      theme: "striped",
      headStyles: { fillColor: [231, 76, 60] },
      styles: { fontSize: 8 },
    });
  }

  // Footer with generation date
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" },
    );
  }

  const pdfBlob = doc.output("arraybuffer");

  return new NextResponse(pdfBlob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${data.project.code}-${data.project.name.replace(/[^a-z0-9]/gi, "-")}-export.pdf"`,
    },
  });
}
