import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema/hr";
import { projects } from "@/db/schema/projects";
import { eq, and, sql, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    const authUserId = session?.user?.id;

    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get manager employee info
    const employeeResult = await db
      .select({
        id: employees.id,
        isManager: employees.isManager,
      })
      .from(employees)
      .where(eq(employees.authId, authUserId))
      .limit(1);

    const employee = employeeResult[0];
    if (!employee || !employee.isManager) {
      return NextResponse.json(
        { error: "Forbidden - Manager access required" },
        { status: 403 },
      );
    }

    // Get projects where manager is supervisor
    // Prioritize active projects (in-progress, then pending), then completed
    const managerProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        supervisorId: projects.supervisorId,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(eq(projects.supervisorId, employee.id))
      .orderBy(desc(projects.updatedAt))
      .limit(10);

    // Get task counts and progress for each project
    const projectIds = managerProjects.map((p) => p.id);

    if (projectIds.length === 0) {
      return NextResponse.json({ projects: [] });
    }

    // Get team members count once (subordinates of this manager)
    const subordinatesCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(
        and(
          eq(employees.managerId, employee.id),
          eq(employees.isManager, false),
        ),
      );

    const membersCount = Number(subordinatesCount[0]?.count || 0);

    // Format projects with progress
    const projectsWithProgress = managerProjects.map((project) => {
      // Calculate progress based on project status
      // pending = 25%, in-progress = 65%, completed = 100%
      let progress = 0;
      if (project.status === "in-progress") {
        progress = 65;
      } else if (project.status === "completed") {
        progress = 100;
      } else {
        progress = 25;
      }

      // Format due date (use updatedAt + 30 days as estimated due date, or use a default)
      const dueDate = new Date(project.updatedAt || project.createdAt);
      dueDate.setDate(dueDate.getDate() + 30);
      const dueDateStr = dueDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      return {
        id: project.id,
        name: project.name,
        progress,
        members: membersCount,
        dueDate: dueDateStr,
      };
    });

    return NextResponse.json({ projects: projectsWithProgress });
  } catch (error) {
    console.error("Error fetching manager projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects", projects: [] },
      { status: 500 },
    );
  }
}
