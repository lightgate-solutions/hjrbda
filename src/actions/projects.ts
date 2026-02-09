"use server";

import { db } from "@/db";
import { projects, projectMembers } from "@/db/schema";
import {
  DrizzleQueryError,
  asc,
  desc,
  eq,
  ilike,
  or,
  and,
  sql,
  exists,
} from "drizzle-orm";
import { createNotification } from "./notification/notification";
import { requireAuth } from "@/actions/auth/dal";
import * as z from "zod";
import { revalidatePath } from "next/cache";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255),
  description: z.string().max(1000).nullable().optional(),
  street: z.string().min(1, "Street is required").max(255),
  city: z.string().min(1, "City is required").max(255),
  state: z.string().min(1, "State is required").max(255),
  latitude: z.union([z.string(), z.number()]).nullable().optional(),
  longitude: z.union([z.string(), z.number()]).nullable().optional(),
  supervisorId: z.number().int().positive().nullable().optional(),
  contractorId: z.number().int().positive().nullable().optional(),
  budgetPlanned: z.number().nonnegative().optional(),
  budgetActual: z.number().nonnegative().optional(),
  memberIds: z.array(z.number().int().positive()).optional(),
});

export type ProjectInput = z.infer<typeof projectSchema>;

export async function listProjects(params: {
  page?: number;
  limit?: number;
  q?: string;
  sortBy?:
    | "id"
    | "name"
    | "code"
    | "description"
    | "street"
    | "city"
    | "state"
    | "status"
    | "budgetPlanned"
    | "budgetActual"
    | "supervisorId"
    | "createdAt"
    | "updatedAt";
  sortDirection?: "asc" | "desc";
}) {
  const { employee } = await requireAuth();
  const isAdmin =
    employee.role.toLowerCase() === "admin" ||
    employee.department.toLowerCase() === "admin";

  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;
  const q = params.q ?? "";
  const sortBy = params.sortBy ?? "createdAt";
  const sortDirection = params.sortDirection === "asc" ? "asc" : "desc";

  let where = q
    ? or(
        ilike(projects.name, `%${q}%`),
        ilike(projects.code, `%${q}%`),
        ilike(projects.street, `%${q}%`),
        ilike(projects.city, `%${q}%`),
        ilike(projects.state, `%${q}%`),
      )
    : undefined;

  if (!isAdmin) {
    const accessFilter = or(
      eq(projects.creatorId, employee.id),
      eq(projects.supervisorId, employee.id),
      exists(
        db
          .select()
          .from(projectMembers)
          .where(
            and(
              eq(projectMembers.projectId, projects.id),
              eq(projectMembers.employeeId, employee.id),
            ),
          ),
      ),
    );
    where = where ? and(where, accessFilter) : accessFilter;
  }

  const totalRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(where);
  const total = totalRows.length;

  const order =
    sortDirection === "asc" ? asc(projects[sortBy]) : desc(projects[sortBy]);

  const rows = await db.query.projects.findMany({
    where,
    orderBy: [order],
    limit,
    offset,
    with: {
      members: true,
    },
  });

  return {
    projects: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getProject(id: number) {
  const { employee } = await requireAuth();
  const isAdmin =
    employee.role.toLowerCase() === "admin" ||
    employee.department.toLowerCase() === "admin";

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: {
      supervisor: true,
      contractor: true,
      creator: true,
      members: {
        with: {
          employee: true,
        },
      },
      milestones: true,
      expenses: true,
    },
  });

  if (!project) return null;

  const hasAccess =
    isAdmin ||
    project.creatorId === employee.id ||
    project.supervisorId === employee.id ||
    project.members.some((m) => m.employeeId === employee.id);

  if (!hasAccess) {
    throw new Error("You do not have access to this project");
  }

  return project;
}

export async function createProject(input: ProjectInput) {
  const { employee } = await requireAuth();

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      project: null,
      error: { reason: "Invalid input" },
    };
  }

  const validatedInput = parsed.data;

  try {
    const [{ maxId }] = await db
      .select({ maxId: sql<number>`max(${projects.id})` })
      .from(projects);
    const nextId = (maxId ?? 0) + 1;
    const generatedCode = `${nextId}BM`;

    const [row] = await db
      .insert(projects)
      .values({
        name: validatedInput.name,
        code: generatedCode,
        description: validatedInput.description ?? null,
        street: validatedInput.street,
        city: validatedInput.city,
        state: validatedInput.state,
        latitude: validatedInput.latitude
          ? String(validatedInput.latitude)
          : null,
        longitude: validatedInput.longitude
          ? String(validatedInput.longitude)
          : null,
        supervisorId: validatedInput.supervisorId ?? null,
        contractorId: validatedInput.contractorId ?? null,
        creatorId: employee.id,
        budgetPlanned: validatedInput.budgetPlanned ?? 0,
        budgetActual: validatedInput.budgetActual ?? 0,
      })
      .returning();

    // Add members
    if (validatedInput.memberIds && validatedInput.memberIds.length > 0) {
      await db.insert(projectMembers).values(
        validatedInput.memberIds.map((memberId) => ({
          projectId: row.id,
          employeeId: memberId,
        })),
      );
    }

    // Notify supervisor if assigned
    if (row.supervisorId) {
      await createNotification({
        user_id: row.supervisorId,
        title: "Assigned as Project Supervisor",
        message: `You've been assigned as supervisor for project: ${row.name} (${row.code})`,
        notification_type: "message",
        reference_id: row.id,
      });
    }

    revalidatePath("/projects");
    return { project: row, error: null };
  } catch (err) {
    const message =
      err instanceof DrizzleQueryError
        ? err.cause?.message
        : "Could not create project";
    return { project: null, error: { reason: message } };
  }
}

export async function updateProject(id: number, input: Partial<ProjectInput>) {
  const { employee } = await requireAuth();
  const isAdmin =
    employee.role.toLowerCase() === "admin" ||
    employee.department.toLowerCase() === "admin";

  const currentProject = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  });

  if (!currentProject) {
    return { project: null, error: { reason: "Project not found" } };
  }

  if (!isAdmin && currentProject.creatorId !== employee.id) {
    return {
      project: null,
      error: {
        reason: "Only the creator or an admin can edit project details",
      },
    };
  }

  try {
    const { memberIds, latitude, longitude, ...projectData } = input;

    const [row] = await db
      .update(projects)
      .set({
        ...projectData,
        latitude:
          latitude !== undefined
            ? latitude
              ? String(latitude)
              : null
            : undefined,
        longitude:
          longitude !== undefined
            ? longitude
              ? String(longitude)
              : null
            : undefined,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    // Update members if provided
    if (memberIds !== undefined) {
      await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
      if (memberIds.length > 0) {
        await db.insert(projectMembers).values(
          memberIds.map((memberId) => ({
            projectId: id,
            employeeId: memberId,
          })),
        );
      }
    }

    // Notify newly assigned supervisor
    if (
      input.supervisorId !== undefined &&
      input.supervisorId !== currentProject?.supervisorId &&
      input.supervisorId !== null
    ) {
      await createNotification({
        user_id: input.supervisorId,
        title: "Assigned as Project Supervisor",
        message: `You've been assigned as supervisor for project: ${row.name} (${row.code})`,
        notification_type: "message",
        reference_id: row.id,
      });
    }

    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return { project: row, error: null };
  } catch (err) {
    const message =
      err instanceof DrizzleQueryError
        ? err.cause?.message
        : "Could not update project";
    return { project: null, error: { reason: message } };
  }
}

export async function deleteProject(id: number) {
  const { employee } = await requireAuth();
  const isAdmin =
    employee.role.toLowerCase() === "admin" ||
    employee.department.toLowerCase() === "admin";

  const currentProject = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  });

  if (!currentProject) {
    return { success: false, error: { reason: "Project not found" } };
  }

  if (!isAdmin && currentProject.creatorId !== employee.id) {
    return {
      success: false,
      error: { reason: "Only the creator or an admin can delete projects" },
    };
  }

  try {
    await db.delete(projects).where(eq(projects.id, id));
    revalidatePath("/projects");
    return { success: true, error: null };
  } catch (_err) {
    return { success: false, error: { reason: "Could not delete project" } };
  }
}

export async function getProjectExportData(id: number) {
  const { employee } = await requireAuth();
  const isAdmin =
    employee.role.toLowerCase() === "admin" ||
    employee.department.toLowerCase() === "admin";

  // Get project with all related data
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
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
    throw new Error("Project not found");
  }

  // Check access
  const hasAccess =
    isAdmin ||
    project.creatorId === employee.id ||
    project.supervisorId === employee.id ||
    project.members.some((m) => m.employeeId === employee.id);

  if (!hasAccess) {
    throw new Error("You do not have access to this project");
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

  return {
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
}
