import { db } from "@/db";
import { projects, projectMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function checkProjectAccess(
  projectId: number,
  userId: number,
  isAdmin: boolean,
) {
  if (isAdmin) return true;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      members: {
        where: eq(projectMembers.employeeId, userId),
      },
    },
  });

  if (!project) return false;

  return (
    project.creatorId === userId ||
    project.supervisorId === userId ||
    project.members.length > 0
  );
}
