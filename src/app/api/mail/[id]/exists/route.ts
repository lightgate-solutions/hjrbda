import { getEmailById } from "@/actions/mail/email";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const emailId = Number(id);
  if (!Number.isFinite(emailId)) {
    return NextResponse.json(null, { status: 400 });
  }
  const result = await getEmailById(emailId);
  if (result.success && result.data) {
    return new Response(null, { status: 200 });
  }
  if (result.error === "Email not found") {
    return NextResponse.json(null, { status: 404 });
  }
  return NextResponse.json(null, { status: 403 });
}
