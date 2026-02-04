import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema/notifications";
import { eq, and, inArray } from "drizzle-orm";
import { getUser } from "@/actions/auth/dal";

export async function POST(req: Request) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();

    //clear all notifications
    if (body.all) {
      await db
        .delete(notifications)
        .where(eq(notifications.user_id, currentUser.id));

      return NextResponse.json({
        success: true,
        message: "All notifications cleared",
      });
    }

    //clear specific notifications
    if (body.ids && Array.isArray(body.ids)) {
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.user_id, currentUser.id),
            inArray(notifications.id, body.ids),
          ),
        );

      return NextResponse.json({
        success: true,
        message: "Selected notifications cleared",
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid request body" },
      { status: 400 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 },
    );
  }
}
