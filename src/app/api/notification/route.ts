import { NextResponse } from "next/server";
import { getUserNotifications } from "@/actions/notification/notification";

export async function GET() {
  try {
    const result = await getUserNotifications();

    // Return the result in the expected format
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          error: result.error || "Failed to fetch notifications",
        },
        { status: result.error === "Log in to continue" ? 401 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data || [],
      error: null,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch notifications",
      },
      { status: 500 },
    );
  }
}
