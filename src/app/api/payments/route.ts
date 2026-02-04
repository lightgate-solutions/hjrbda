import { createPayment, getAllPayments } from "@/actions/payments/payments";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const payment = await createPayment(data);
    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to create payment" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const payments = await getAllPayments();
    return NextResponse.json(payments);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to fetch payments" },
      { status: 500 },
    );
  }
}
