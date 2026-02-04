import { getApprovedPayments } from "@/actions/payments/payments";
import { NextResponse } from "next/server";
import { createObjectCsvStringifier } from "csv-writer";

export async function GET() {
  try {
    const approved = await getApprovedPayments();

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: "payer_name", title: "PayerName" },
        { id: "account_number", title: "AccountNumber" },
        { id: "bank_name", title: "BankName" },
        { id: "amount", title: "Amount" },
        { id: "payment_reference", title: "Reference" },
        { id: "payment_date", title: "Date" },
      ],
    });

    const csv =
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(approved);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="bank_payments.csv"',
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to export payments" },
      { status: 500 },
    );
  }
}
