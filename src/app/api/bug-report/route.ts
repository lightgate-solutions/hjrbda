import { NextResponse, after } from "next/server";
import { Resend } from "resend";
import { db } from "@/db";
import { bugReports, bugReportAttachments } from "@/db/schema/bug-reports";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = process.env.RESEND_SENDER_EMAIL;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      title,
      severity,
      description,
      stepsToReproduce,
      attachments = [],
    } = body;

    const severityColors: Record<string, string> = {
      low: "#22c55e",
      medium: "#f59e0b",
      high: "#f97316",
      critical: "#ef4444",
    };

    // Save to database
    const [bugReport] = await db
      .insert(bugReports)
      .values({
        name,
        email,
        title,
        severity,
        description,
        stepsToReproduce: stepsToReproduce || null,
      })
      .returning();

    // Save attachments if any
    if (attachments.length > 0) {
      await db.insert(bugReportAttachments).values(
        attachments.map(
          (attachment: {
            originalFileName: string;
            filePath: string;
            fileSize: string;
            mimeType: string;
          }) => ({
            bugReportId: bugReport.id,
            originalFileName: attachment.originalFileName,
            filePath: attachment.filePath,
            fileSize: attachment.fileSize,
            mimeType: attachment.mimeType,
          }),
        ),
      );
    }

    // Send email after response — DB insert already succeeded
    after(async () => {
      try {
        const { error } = await resend.emails.send({
          from: `HJRBDA <${sendEmail}>`,
          to: [
            "elameendaiyabu@gmail.com",
            "ibrahimhsalman5@gmail.com",
            "sulaymancodes@gmail.com",
            "khaleefasabo@gmail.com",
            "mahmoodsaadiq@gmail.com",
          ],
          subject: `[${severity.toUpperCase()}] Bug Report: ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">Bug Report</h2>

              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <h3 style="margin: 0 0 8px 0; color: #374151;">Reporter Information</h3>
                <p style="margin: 4px 0;"><strong>Name:</strong> ${name}</p>
                <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
              </div>

              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <h3 style="margin: 0 0 8px 0; color: #374151;">Bug Details</h3>
                <p style="margin: 4px 0;"><strong>Title:</strong> ${title}</p>
                <p style="margin: 4px 0;">
                  <strong>Severity:</strong>
                  <span style="background-color: ${severityColors[severity]}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                    ${severity.toUpperCase()}
                  </span>
                </p>
              </div>

              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <h3 style="margin: 0 0 8px 0; color: #374151;">Description</h3>
                <p style="margin: 4px 0; white-space: pre-wrap;">${description}</p>
              </div>

              ${
                stepsToReproduce
                  ? `
              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <h3 style="margin: 0 0 8px 0; color: #374151;">Steps to Reproduce</h3>
                <p style="margin: 4px 0; white-space: pre-wrap;">${stepsToReproduce}</p>
              </div>
              `
                  : ""
              }

              ${
                attachments.length > 0
                  ? `
              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px;">
                <h3 style="margin: 0 0 8px 0; color: #374151;">Attachments (${attachments.length})</h3>
                <ul style="margin: 4px 0; padding-left: 20px;">
                  ${attachments
                    .map(
                      (attachment: {
                        originalFileName: string;
                        filePath: string;
                        fileSize: string;
                      }) => `
                    <li style="margin: 4px 0;">
                      <a href="${attachment.filePath}" style="color: #2563eb; text-decoration: none;">
                        ${attachment.originalFileName}
                      </a>
                      <span style="color: #6b7280; font-size: 12px;"> (${Math.round(Number.parseInt(attachment.fileSize) / 1024)} KB)</span>
                    </li>
                  `,
                    )
                    .join("")}
                </ul>
              </div>
              `
                  : ""
              }

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #6b7280; font-size: 12px;">
                This bug report was submitted from HJRBDA application.
              </p>
            </div>
          `,
        });

        if (error) {
          console.error("Resend error:", error);
        }
      } catch (emailError) {
        console.error("Failed to send bug report email:", emailError);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bug report error:", error);
    return NextResponse.json(
      { error: "Failed to process bug report" },
      { status: 500 },
    );
  }
}
