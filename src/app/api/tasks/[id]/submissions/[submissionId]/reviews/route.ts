import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees, taskReviews } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { createSubmissionReview } from "@/actions/tasks/taskSubmissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> },
) {
  try {
    const { id, submissionId: submissionIdParam } = await params;
    const taskId = Number(id);
    const submissionId = Number(submissionIdParam);
    if (!taskId || !submissionId)
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const reviews = await db
      .select()
      .from(taskReviews)
      .where(
        and(
          eq(taskReviews.taskId, taskId),
          eq(taskReviews.submissionId, submissionId),
        ),
      )
      .orderBy(desc(taskReviews.reviewedAt));

    return NextResponse.json({ reviews });
  } catch (err) {
    console.error("Error fetching reviews:", err);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> },
) {
  try {
    const { id, submissionId: submissionIdParam } = await params;
    const taskId = Number(id);
    const submissionId = Number(submissionIdParam);
    if (!taskId || !submissionId)
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const status =
      body?.status === "Accepted" || body?.status === "Rejected"
        ? (body.status as "Accepted" | "Rejected")
        : undefined;
    const grade = typeof body?.grade === "number" ? body.grade : undefined;
    const note =
      typeof body?.reviewNote === "string" ? body.reviewNote : undefined;

    if (!status) {
      return NextResponse.json(
        { error: "Missing or invalid status" },
        { status: 400 },
      );
    }

    // Derive manager employee id from session
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
    if (!emp?.isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reviewNote =
      grade != null ? `Grade: ${grade}${note ? ` - ${note}` : ""}` : note;

    const res = await createSubmissionReview({
      submissionId,
      taskId,
      reviewedBy: emp.id,
      status,
      reviewNote,
    });

    if (res.error) {
      return NextResponse.json({ error: res.error.reason }, { status: 400 });
    }

    return NextResponse.json({ message: res.success?.reason });
  } catch (err) {
    console.error("Error creating review:", err);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 },
    );
  }
}
