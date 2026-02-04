import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import {
  createTaskMessage,
  getMessagesForTask,
} from "@/actions/tasks/taskMessages";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!id)
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 });

    const searchParams = request.nextUrl.searchParams;
    const afterId = Number(searchParams.get("afterId")) || undefined;
    const limit = Number(searchParams.get("limit")) || undefined;

    const messages = await getMessagesForTask(id, {
      afterId,
      limit: limit && limit > 0 ? limit : undefined,
    });
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("Error fetching messages:", err);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!id)
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 });

    const body = await request.json();
    const content = String(body.content || "").trim();
    if (!content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 },
      );
    }

    // Derive sender from session
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

    const res = await createTaskMessage({
      taskId: id,
      senderId: emp.id,
      content,
    });
    if (res.error) {
      return NextResponse.json({ error: res.error.reason }, { status: 400 });
    }
    // Return only the newly created message for lighter payloads
    return NextResponse.json({ message: res.success?.message });
  } catch (err) {
    console.error("Error posting message:", err);
    return NextResponse.json(
      { error: "Failed to post message" },
      { status: 500 },
    );
  }
}
