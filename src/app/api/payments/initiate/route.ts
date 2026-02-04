import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  const { amount, email } = await req.json();

  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      { amount: amount * 100, email },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET}`,
        },
      },
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Payment initiation failed" },
      { status: 500 },
    );
  }
}
