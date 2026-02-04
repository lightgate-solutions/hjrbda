"use server";

import { db } from "@/db";
import { employees, employeesDocuments } from "@/db/schema";
import { DrizzleQueryError, eq } from "drizzle-orm";
import { getUser } from "../auth/dal";
import { revalidatePath } from "next/cache";

interface UploadEmployeeDocumentProps {
  employeeId: number;
  documentType: string;
  documentName: string;
  filePath: string;
  fileSize: string;
  mimeType: string;
  pathname?: string;
}

export async function uploadEmployeeDocumentAction(
  data: UploadEmployeeDocumentProps,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    await db.transaction(async (tx) => {
      // Verify the employee exists
      const [employee] = await tx
        .select({ id: employees.id, department: employees.department })
        .from(employees)
        .where(eq(employees.id, data.employeeId))
        .limit(1);

      if (!employee) {
        throw new Error(`Employee with id ${data.employeeId} not found`);
      }

      // Insert the document
      await tx.insert(employeesDocuments).values({
        employeeId: data.employeeId,
        documentType: data.documentType,
        documentName: data.documentName,
        filePath: data.filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        uploadedBy: user.id,
        department: employee.department,
      });
    });

    if (data.pathname) {
      revalidatePath(data.pathname);
    }

    return {
      success: { reason: "Employee document uploaded successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message },
      };
    }

    return {
      error: {
        reason: "Couldn't upload document. Check inputs and try again!",
      },
      success: null,
    };
  }
}

export async function getEmployeeDocuments(employeeId: number) {
  try {
    const documents = await db
      .select()
      .from(employeesDocuments)
      .where(eq(employeesDocuments.employeeId, employeeId))
      .orderBy(employeesDocuments.createdAt);

    return {
      success: true,
      data: documents,
      error: null,
    };
  } catch (_err) {
    return {
      success: false,
      data: null,
      error: "Failed to fetch employee documents",
    };
  }
}

export async function deleteEmployeeDocument(
  documentId: number,
  pathname?: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    await db
      .delete(employeesDocuments)
      .where(eq(employeesDocuments.id, documentId));

    if (pathname) {
      revalidatePath(pathname);
    }

    return {
      success: { reason: "Document deleted successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message },
      };
    }

    return {
      error: {
        reason: "Couldn't delete document. Please try again.",
      },
      success: null,
    };
  }
}
