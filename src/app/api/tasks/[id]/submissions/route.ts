import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getTaskSubmissions,
  submitTask,
} from "@/actions/tasks/taskSubmissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const taskId = Number(id);
    if (!taskId)
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
    const submissions = await getTaskSubmissions(taskId);
    return NextResponse.json({ submissions });
  } catch (err) {
    console.error("Error fetching submissions:", err);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const taskId = Number(id);
    if (!taskId)
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 });

    const body = await request.json();
    const submissionNote =
      typeof body.submissionNote === "string" ? body.submissionNote : undefined;
    const submittedFiles = Array.isArray(body.submittedFiles)
      ? body.submittedFiles
      : undefined;

    // Derive submitting employee from session
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    const authUserId = session?.user?.id;
    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emp = await db
      .select()
      .from(employees)
      .where(eq(employees.authId, authUserId))
      .limit(1)
      .then((r) => r[0]);
    if (!emp) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 403 },
      );
    }

    const payload: {
      taskId: number;
      submittedBy: number;
      submissionNote?: string;
      submittedFiles?: { fileUrl: string; fileName: string }[];
    } = {
      taskId,
      submittedBy: emp.id,
      submissionNote,
      submittedFiles,
    };

    const res = await submitTask(payload);

    if (res.error) {
      return NextResponse.json({ error: res.error.reason }, { status: 400 });
    }

    const submissions = await getTaskSubmissions(taskId);
    return NextResponse.json({ message: res.success?.reason, submissions });
  } catch (err) {
    console.error("Error submitting task:", err);
    return NextResponse.json(
      { error: "Failed to submit task" },
      { status: 500 },
    );
  }
}
