import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { ids } = await req.json();

    if (!ids?.length) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, message: "Marked as read" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to mark notifications as read" },
      { status: 500 },
    );
  }
}
