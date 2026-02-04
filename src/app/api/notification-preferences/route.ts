import { db } from "@/db";
import { notification_preferences } from "@/db/schema/notification-preferences";
import { getUser } from "@/actions/auth/dal";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getUser();
  if (!user)
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );

  const prefs = await db
    .select()
    .from(notification_preferences)
    .where(eq(notification_preferences.user_id, user.id));

  // If no preferences found, return defaults
  if (!prefs[0]) {
    return NextResponse.json({
      success: true,
      data: {
        email_notifications: true,
        in_app_notifications: true,
        email_on_in_app_message: true,
        email_on_task_notification: false,
        email_on_general_notification: false,
        notify_on_message: true,
      },
    });
  }

  return NextResponse.json({ success: true, data: prefs[0] });
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );

    const body = await req.json();

    // Prepare updates with defaults for new fields
    const updates = {
      email_notifications: body.email_notifications ?? true,
      in_app_notifications: body.in_app_notifications ?? true,
      email_on_in_app_message: body.email_on_in_app_message ?? true,
      email_on_task_notification: body.email_on_task_notification ?? true,
      email_on_general_notification: body.email_on_general_notification ?? true,
      notify_on_message: true, // Keep forcing this to true
    };

    console.log("trying to save user preferences", updates, user.id);

    const existingPref = await db.query.notification_preferences.findFirst({
      where: eq(notification_preferences.user_id, user.id),
    });

    if (existingPref) {
      await db
        .update(notification_preferences)
        .set(updates)
        .where(eq(notification_preferences.user_id, user.id));
    } else {
      await db.insert(notification_preferences).values({
        ...updates,
        user_id: user.id,
      });
    }

    return NextResponse.json({ success: true, message: "Preferences updated" });
  } catch (error) {
    console.log(error, "error saving preferences");
    return NextResponse.json(
      { success: false, error: "Failed to save preferences" },
      { status: 500 },
    );
  }
}
