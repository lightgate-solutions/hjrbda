"use server";

import { db } from "@/db";
import { eq, isNull, and, desc, sql, or } from "drizzle-orm";
import { getUser } from "../auth/dal";
import { employees } from "@/db/schema/hr";
import {
  payrun,
  payrunItems,
  payrunItemDetails,
  employeeSalary,
  salaryStructure,
  allowances,
  deductions,
  employeeAllowances,
  employeeDeductions,
  salaryAllowances,
  salaryDeductions,
} from "@/db/schema/payroll";
import { loanApplications, loanRepayments } from "@/db/schema/loans";
import { revalidatePath } from "next/cache";
import { not } from "drizzle-orm";

type PayrunType = "salary" | "allowance";

interface GeneratePayrunProps {
  type: PayrunType;
  allowanceId?: number;
  month: number;
  year: number;
  day?: number;
}

export async function generatePayrun(
  data: GeneratePayrunProps,
  pathname: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  const { type, allowanceId, month, year, day = 1 } = data;

  try {
    return await db.transaction(async (tx) => {
      // Check for existing payrun in the same period
      const existing = await tx
        .select({ id: payrun.id })
        .from(payrun)
        .where(
          and(
            eq(payrun.year, year),
            eq(payrun.month, month),
            eq(payrun.day, day),
            eq(payrun.type, type),
            type === "allowance" && allowanceId
              ? eq(payrun.allowanceId, allowanceId)
              : isNull(payrun.allowanceId),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        return {
          error: { reason: "A payrun already exists for this period and type" },
          success: null,
        };
      }

      let payrunName = "";
      let employeePayrollData: Array<{
        employeeId: number;
        employeeName: string;
        baseSalary: number;
        allowances: Array<{
          id: number;
          name: string;
          amount: number;
          allowanceId?: number;
          employeeAllowanceId?: number;
          taxAmount: number;
        }>;
        deductions: Array<{
          id: number;
          name: string;
          amount: number;
          deductionId?: number;
          employeeDeductionId?: number;
        }>;
        loans: Array<{
          loanApplicationId: number;
          name: string;
          amount: number;
          remainingBalance: number;
        }>;
        grossPay: number;
        totalAllowances: number;
        totalDeductions: number;
        totalTaxes: number;
        netPay: number;
      }> = [];

      if (type === "salary") {
        // Generate full salary payrun
        payrunName = `Salary Payrun - ${getMonthName(month)} ${year}`;
        employeePayrollData = await calculateSalaryPayrun(tx);
      } else if (type === "allowance" && allowanceId) {
        // Generate allowance-specific payrun
        const allowance = await tx
          .select({ name: allowances.name })
          .from(allowances)
          .where(eq(allowances.id, allowanceId))
          .limit(1);

        if (allowance.length === 0) {
          return {
            error: { reason: "Allowance not found" },
            success: null,
          };
        }

        payrunName = `${allowance[0].name} Payrun - ${getMonthName(month)} ${year}`;
        employeePayrollData = await calculateAllowancePayrun(tx, allowanceId);
      } else {
        return {
          error: { reason: "Invalid payrun configuration" },
          success: null,
        };
      }

      if (employeePayrollData.length === 0) {
        return {
          error: { reason: "No eligible employees found for this payrun" },
          success: null,
        };
      }

      // Calculate totals
      const totalGrossPay = employeePayrollData.reduce(
        (sum, emp) => sum + emp.grossPay,
        0,
      );
      const totalDeductionsAmount = employeePayrollData.reduce(
        (sum, emp) => sum + emp.totalDeductions + emp.totalTaxes,
        0,
      );
      const totalNetPay = employeePayrollData.reduce(
        (sum, emp) => sum + emp.netPay,
        0,
      );

      // Create payrun record
      const [newPayrun] = await tx
        .insert(payrun)
        .values({
          name: payrunName,
          type,
          allowanceId: type === "allowance" ? allowanceId : null,
          day,
          month,
          year,
          totalEmployees: employeePayrollData.length,
          totalGrossPay: totalGrossPay.toFixed(2),
          totalDeductions: totalDeductionsAmount.toFixed(2),
          totalNetPay: totalNetPay.toFixed(2),
          status: "draft",
          generatedBy: user.id,
        })
        .returning({ id: payrun.id });

      // Create payrun items for each employee
      for (const empData of employeePayrollData) {
        const [payrunItem] = await tx
          .insert(payrunItems)
          .values({
            type: type === "salary" ? "salary" : "allowance",
            payrunId: newPayrun.id,
            employeeId: empData.employeeId,
            baseSalary: empData.baseSalary.toFixed(2),
            totalAllowances: empData.totalAllowances.toFixed(2),
            totalDeductions: empData.totalDeductions.toFixed(2),
            grossPay: empData.grossPay.toFixed(2),
            taxableIncome: empData.grossPay.toFixed(2),
            totalTaxes: empData.totalTaxes.toFixed(2),
            netPay: empData.netPay.toFixed(2),
            status: "draft",
          })
          .returning({ id: payrunItems.id });

        // Create detail records
        const detailRecords: Array<{
          payrunItemId: number;
          employeeId: number;
          detailType:
            | "base_salary"
            | "allowance"
            | "deduction"
            | "tax"
            | "loan";
          description: string;
          allowanceId?: number | null;
          deductionId?: number | null;
          employeeAllowanceId?: number | null;
          employeeDeductionId?: number | null;
          loanApplicationId?: number | null;
          amount: string;
          originalAmount?: string | null;
          remainingAmount?: string | null;
        }> = [];

        // Base salary (only for salary type)
        if (type === "salary" && empData.baseSalary > 0) {
          detailRecords.push({
            payrunItemId: payrunItem.id,
            employeeId: empData.employeeId,
            detailType: "base_salary",
            description: "Base Salary",
            amount: empData.baseSalary.toFixed(2),
          });
        }

        // Allowances
        for (const allowance of empData.allowances) {
          detailRecords.push({
            payrunItemId: payrunItem.id,
            employeeId: empData.employeeId,
            detailType: "allowance",
            description: allowance.name,
            allowanceId: allowance.allowanceId || null,
            employeeAllowanceId: allowance.employeeAllowanceId || null,
            amount: allowance.amount.toFixed(2),
          });

          // Add tax detail if applicable
          if (allowance.taxAmount > 0) {
            detailRecords.push({
              payrunItemId: payrunItem.id,
              employeeId: empData.employeeId,
              detailType: "tax",
              description: `Tax on ${allowance.name}`,
              allowanceId: allowance.allowanceId || null,
              amount: (-allowance.taxAmount).toFixed(2),
            });
          }
        }

        // Deductions
        for (const deduction of empData.deductions) {
          detailRecords.push({
            payrunItemId: payrunItem.id,
            employeeId: empData.employeeId,
            detailType: "deduction",
            description: deduction.name,
            deductionId: deduction.deductionId || null,
            employeeDeductionId: deduction.employeeDeductionId || null,
            amount: (-deduction.amount).toFixed(2),
          });
        }

        // Loan deductions
        for (const loan of empData.loans) {
          detailRecords.push({
            payrunItemId: payrunItem.id,
            employeeId: empData.employeeId,
            detailType: "loan",
            description: loan.name,
            loanApplicationId: loan.loanApplicationId,
            amount: (-loan.amount).toFixed(2),
            originalAmount: loan.amount.toFixed(2),
            remainingAmount: (loan.remainingBalance - loan.amount).toFixed(2),
          });
        }

        if (detailRecords.length > 0) {
          await tx.insert(payrunItemDetails).values(detailRecords);
        }
      }

      revalidatePath(pathname);
      return {
        success: {
          reason: `Payrun generated successfully with ${employeePayrollData.length} employees`,
          payrunId: newPayrun.id,
        },
        error: null,
      };
    });
  } catch (err) {
    return {
      error: {
        reason:
          err instanceof Error ? err.message : "Failed to generate payrun",
      },
      success: null,
    };
  }
}

async function calculateSalaryPayrun(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
) {
  // Get all employees with active salary structures
  const employeesWithSalary = await tx
    .select({
      employeeId: employeeSalary.employeeId,
      employeeName: employees.name,
      salaryStructureId: employeeSalary.salaryStructureId,
      baseSalary: salaryStructure.baseSalary,
    })
    .from(employeeSalary)
    .innerJoin(employees, eq(employeeSalary.employeeId, employees.id))
    .innerJoin(
      salaryStructure,
      eq(employeeSalary.salaryStructureId, salaryStructure.id),
    )
    .where(
      and(
        isNull(employeeSalary.effectiveTo),
        eq(employees.status, "active"),
        eq(salaryStructure.active, true),
      ),
    );

  const result = [];

  for (const emp of employeesWithSalary) {
    const baseSalaryNumber = Number(emp.baseSalary);

    // Get structure allowances (only allowances attached to salary structure, not individual employee allowances)
    const structureAllowances = await tx
      .select({
        id: allowances.id,
        name: allowances.name,
        amount: allowances.amount,
        percentage: allowances.percentage,
        taxable: allowances.taxable,
        taxPercentage: allowances.taxPercentage,
      })
      .from(salaryAllowances)
      .innerJoin(allowances, eq(salaryAllowances.allowanceId, allowances.id))
      .where(
        and(
          eq(salaryAllowances.salaryStructureId, emp.salaryStructureId),
          isNull(salaryAllowances.effectiveTo),
        ),
      );

    // Get structure deductions
    const structureDeductions = await tx
      .select({
        id: deductions.id,
        name: deductions.name,
        amount: deductions.amount,
        percentage: deductions.percentage,
      })
      .from(salaryDeductions)
      .innerJoin(deductions, eq(salaryDeductions.deductionId, deductions.id))
      .where(
        and(
          eq(salaryDeductions.salaryStructureId, emp.salaryStructureId),
          isNull(salaryDeductions.effectiveTo),
        ),
      );

    // Get employee-specific deductions (excluding loan-type deductions to avoid duplicates)
    const empDeductions = await tx
      .select({
        id: employeeDeductions.id,
        name: employeeDeductions.name,
        amount: employeeDeductions.amount,
        percentage: employeeDeductions.percentage,
      })
      .from(employeeDeductions)
      .where(
        and(
          eq(employeeDeductions.employeeId, emp.employeeId),
          eq(employeeDeductions.active, true),
          isNull(employeeDeductions.effectiveTo),
          not(eq(employeeDeductions.type, "loan")),
        ),
      );

    // Get active loan deductions
    const activeLoans = await tx
      .select({
        id: loanApplications.id,
        monthlyDeduction: loanApplications.monthlyDeduction,
        remainingBalance: loanApplications.remainingBalance,
      })
      .from(loanApplications)
      .where(
        and(
          eq(loanApplications.employeeId, emp.employeeId),
          eq(loanApplications.status, "active"),
        ),
      );

    // Calculate allowances (only from salary structure)
    const calculatedAllowances = structureAllowances.map((a) => ({
      id: a.id,
      name: a.name,
      allowanceId: a.id,
      amount: a.percentage
        ? (Number(a.percentage) / 100) * baseSalaryNumber
        : Number(a.amount || 0),
      taxAmount:
        a.taxable && a.taxPercentage
          ? (Number(a.taxPercentage) / 100) *
            (a.percentage
              ? (Number(a.percentage) / 100) * baseSalaryNumber
              : Number(a.amount || 0))
          : 0,
    }));

    // Calculate deductions (merge by name to avoid duplicates)
    const deductionsMap = new Map();
    for (const d of structureDeductions) {
      deductionsMap.set(d.name, {
        id: d.id,
        name: d.name,
        deductionId: d.id,
        amount: d.percentage
          ? (Number(d.percentage) / 100) * baseSalaryNumber
          : Number(d.amount || 0),
      });
    }
    for (const d of empDeductions) {
      deductionsMap.set(d.name, {
        id: d.id,
        name: d.name,
        employeeDeductionId: d.id,
        amount: d.percentage
          ? (Number(d.percentage) / 100) * baseSalaryNumber
          : Number(d.amount || 0),
      });
    }
    const calculatedDeductions = Array.from(deductionsMap.values());

    // Calculate loans
    const calculatedLoans = activeLoans.map((loan) => ({
      loanApplicationId: loan.id,
      name: "Loan Repayment",
      amount: Number(loan.monthlyDeduction || 0),
      remainingBalance: Number(loan.remainingBalance || 0),
    }));

    const totalAllowances = calculatedAllowances.reduce(
      (sum, a) => sum + a.amount,
      0,
    );
    const totalTaxes = calculatedAllowances.reduce(
      (sum, a) => sum + a.taxAmount,
      0,
    );
    const totalDeductions = calculatedDeductions.reduce(
      (sum, d) => sum + d.amount,
      0,
    );
    const totalLoans = calculatedLoans.reduce((sum, l) => sum + l.amount, 0);
    const grossPay = baseSalaryNumber + totalAllowances;
    const netPay = grossPay - totalTaxes - totalDeductions - totalLoans;

    result.push({
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      baseSalary: baseSalaryNumber,
      allowances: calculatedAllowances,
      deductions: calculatedDeductions,
      loans: calculatedLoans,
      grossPay,
      totalAllowances,
      totalDeductions: totalDeductions + totalLoans,
      totalTaxes,
      netPay,
    });
  }

  return result;
}

async function calculateAllowancePayrun(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  allowanceId: number,
) {
  // Get the allowance details
  const allowance = await tx
    .select({
      id: allowances.id,
      name: allowances.name,
      amount: allowances.amount,
      percentage: allowances.percentage,
      taxable: allowances.taxable,
      taxPercentage: allowances.taxPercentage,
    })
    .from(allowances)
    .where(eq(allowances.id, allowanceId))
    .limit(1);

  if (allowance.length === 0) {
    return [];
  }

  const allowanceData = allowance[0];

  // Get employees who have this allowance assigned (either through salary structure or directly)
  const employeesWithAllowance = await tx
    .select({
      employeeId: employees.id,
      employeeName: employees.name,
      baseSalary: salaryStructure.baseSalary,
      employeeAllowanceId: employeeAllowances.id,
    })
    .from(employeeAllowances)
    .innerJoin(employees, eq(employeeAllowances.employeeId, employees.id))
    .leftJoin(
      employeeSalary,
      and(
        eq(employeeSalary.employeeId, employees.id),
        isNull(employeeSalary.effectiveTo),
      ),
    )
    .leftJoin(
      salaryStructure,
      eq(employeeSalary.salaryStructureId, salaryStructure.id),
    )
    .where(
      and(
        eq(employeeAllowances.allowanceId, allowanceId),
        isNull(employeeAllowances.effectiveTo),
        eq(employees.status, "active"),
      ),
    );

  // Also get employees who have this allowance through their salary structure
  const employeesFromStructure = await tx
    .select({
      employeeId: employees.id,
      employeeName: employees.name,
      baseSalary: salaryStructure.baseSalary,
    })
    .from(salaryAllowances)
    .innerJoin(
      employeeSalary,
      eq(salaryAllowances.salaryStructureId, employeeSalary.salaryStructureId),
    )
    .innerJoin(employees, eq(employeeSalary.employeeId, employees.id))
    .innerJoin(
      salaryStructure,
      eq(employeeSalary.salaryStructureId, salaryStructure.id),
    )
    .where(
      and(
        eq(salaryAllowances.allowanceId, allowanceId),
        isNull(salaryAllowances.effectiveTo),
        isNull(employeeSalary.effectiveTo),
        eq(employees.status, "active"),
      ),
    );

  // Merge and deduplicate employees
  const employeeMap = new Map();
  for (const emp of [...employeesWithAllowance, ...employeesFromStructure]) {
    if (!employeeMap.has(emp.employeeId)) {
      employeeMap.set(emp.employeeId, emp);
    }
  }

  const result = [];

  for (const emp of employeeMap.values()) {
    const baseSalaryNumber = Number(emp.baseSalary || 0);
    const allowanceAmount = allowanceData.percentage
      ? (Number(allowanceData.percentage) / 100) * baseSalaryNumber
      : Number(allowanceData.amount || 0);

    const taxAmount =
      allowanceData.taxable && allowanceData.taxPercentage
        ? (Number(allowanceData.taxPercentage) / 100) * allowanceAmount
        : 0;

    result.push({
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      baseSalary: 0, // Not included in allowance-only payrun
      allowances: [
        {
          id: allowanceData.id,
          name: allowanceData.name,
          allowanceId: allowanceData.id,
          employeeAllowanceId: emp.employeeAllowanceId,
          amount: allowanceAmount,
          taxAmount,
        },
      ],
      deductions: [],
      loans: [],
      grossPay: allowanceAmount,
      totalAllowances: allowanceAmount,
      totalDeductions: 0,
      totalTaxes: taxAmount,
      netPay: allowanceAmount - taxAmount,
    });
  }

  return result;
}

function getMonthName(month: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1] || "";
}

export async function getPayruns() {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const payruns = await db
      .select({
        id: payrun.id,
        name: payrun.name,
        type: payrun.type,
        allowanceId: payrun.allowanceId,
        allowanceName: allowances.name,
        day: payrun.day,
        month: payrun.month,
        year: payrun.year,
        totalEmployees: payrun.totalEmployees,
        totalGrossPay: payrun.totalGrossPay,
        totalDeductions: payrun.totalDeductions,
        totalNetPay: payrun.totalNetPay,
        status: payrun.status,
        generatedBy: payrun.generatedBy,
        generatedByName: employees.name,
        approvedBy: payrun.approvedBy,
        approvedAt: payrun.approvedAt,
        createdAt: payrun.createdAt,
      })
      .from(payrun)
      .leftJoin(allowances, eq(payrun.allowanceId, allowances.id))
      .leftJoin(employees, eq(payrun.generatedBy, employees.id))
      .orderBy(desc(payrun.createdAt));

    return payruns;
  } catch (_error) {
    return [];
  }
}

export async function getPayrunById(id: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const payrunData = await db
      .select({
        id: payrun.id,
        name: payrun.name,
        type: payrun.type,
        allowanceId: payrun.allowanceId,
        allowanceName: allowances.name,
        day: payrun.day,
        month: payrun.month,
        year: payrun.year,
        totalEmployees: payrun.totalEmployees,
        totalGrossPay: payrun.totalGrossPay,
        totalDeductions: payrun.totalDeductions,
        totalNetPay: payrun.totalNetPay,
        status: payrun.status,
        generatedBy: payrun.generatedBy,
        generatedByName: employees.name,
        approvedBy: payrun.approvedBy,
        approvedAt: payrun.approvedAt,
        createdAt: payrun.createdAt,
      })
      .from(payrun)
      .leftJoin(allowances, eq(payrun.allowanceId, allowances.id))
      .leftJoin(employees, eq(payrun.generatedBy, employees.id))
      .where(eq(payrun.id, id))
      .limit(1);

    if (payrunData.length === 0) {
      return null;
    }

    // Get payrun items with employee details
    const items = await db
      .select({
        id: payrunItems.id,
        employeeId: payrunItems.employeeId,
        employeeName: employees.name,
        staffNumber: employees.staffNumber,
        department: employees.department,
        baseSalary: payrunItems.baseSalary,
        totalAllowances: payrunItems.totalAllowances,
        totalDeductions: payrunItems.totalDeductions,
        grossPay: payrunItems.grossPay,
        totalTaxes: payrunItems.totalTaxes,
        netPay: payrunItems.netPay,
        status: payrunItems.status,
      })
      .from(payrunItems)
      .innerJoin(employees, eq(payrunItems.employeeId, employees.id))
      .where(eq(payrunItems.payrunId, id));

    // Get details for each item
    const itemsWithDetails = await Promise.all(
      items.map(async (item) => {
        const details = await db
          .select({
            id: payrunItemDetails.id,
            detailType: payrunItemDetails.detailType,
            description: payrunItemDetails.description,
            amount: payrunItemDetails.amount,
            originalAmount: payrunItemDetails.originalAmount,
            remainingAmount: payrunItemDetails.remainingAmount,
          })
          .from(payrunItemDetails)
          .where(eq(payrunItemDetails.payrunItemId, item.id));

        return {
          ...item,
          details,
        };
      }),
    );

    return {
      ...payrunData[0],
      items: itemsWithDetails,
    };
  } catch (_error) {
    return null;
  }
}

export async function approvePayrun(id: number, pathname: string) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const payrunData = await db
      .select({ status: payrun.status })
      .from(payrun)
      .where(eq(payrun.id, id))
      .limit(1);

    if (payrunData.length === 0) {
      return {
        error: { reason: "Payrun not found" },
        success: null,
      };
    }

    if (
      payrunData[0].status !== "draft" &&
      payrunData[0].status !== "pending"
    ) {
      return {
        error: { reason: "Only draft or pending payruns can be approved" },
        success: null,
      };
    }

    await db
      .update(payrun)
      .set({
        status: "approved",
        approvedBy: user.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payrun.id, id));

    // Also update all payrun items
    await db
      .update(payrunItems)
      .set({
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(payrunItems.payrunId, id));

    revalidatePath(pathname);
    revalidatePath("/finance/payruns");

    return {
      success: { reason: "Payrun approved successfully" },
      error: null,
    };
  } catch (_error) {
    return {
      error: { reason: "Failed to approve payrun" },
      success: null,
    };
  }
}

export async function completePayrun(id: number, pathname: string) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const payrunData = await db
      .select({ status: payrun.status })
      .from(payrun)
      .where(eq(payrun.id, id))
      .limit(1);

    if (payrunData.length === 0) {
      return {
        error: { reason: "Payrun not found" },
        success: null,
      };
    }

    if (payrunData[0].status !== "approved") {
      return {
        error: { reason: "Only approved payruns can be marked as completed" },
        success: null,
      };
    }

    await db
      .update(payrun)
      .set({
        status: "paid",
        completedBy: user.id,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payrun.id, id));

    // Update all payrun items
    await db
      .update(payrunItems)
      .set({
        status: "paid",
        updatedAt: new Date(),
      })
      .where(eq(payrunItems.payrunId, id));

    // Update loan repayments if this is a salary payrun
    // Get all loan details from this payrun
    const loanDetails = await db
      .select({
        loanApplicationId: payrunItemDetails.loanApplicationId,
        amount: payrunItemDetails.amount,
        payrunItemId: payrunItemDetails.payrunItemId,
      })
      .from(payrunItemDetails)
      .innerJoin(
        payrunItems,
        eq(payrunItemDetails.payrunItemId, payrunItems.id),
      )
      .where(
        and(
          eq(payrunItems.payrunId, id),
          eq(payrunItemDetails.detailType, "loan"),
        ),
      );

    // Update loan balances
    for (const loan of loanDetails) {
      if (loan.loanApplicationId) {
        const amount = Math.abs(Number(loan.amount));
        await db
          .update(loanApplications)
          .set({
            totalRepaid: sql`${loanApplications.totalRepaid} + ${amount}`,
            remainingBalance: sql`${loanApplications.remainingBalance} - ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(loanApplications.id, loan.loanApplicationId));

        // Get updated loan info including employee deduction ID
        const updatedLoan = await db
          .select({
            remainingBalance: loanApplications.remainingBalance,
            employeeDeductionId: loanApplications.employeeDeductionId,
          })
          .from(loanApplications)
          .where(eq(loanApplications.id, loan.loanApplicationId))
          .limit(1);

        const newRemainingBalance = Number(
          updatedLoan[0]?.remainingBalance || 0,
        );

        // Update the corresponding loan repayment schedule entry
        // Find the next pending repayment for this loan and mark it as paid
        const pendingRepayment = await db
          .select({ id: loanRepayments.id })
          .from(loanRepayments)
          .where(
            and(
              eq(loanRepayments.loanApplicationId, loan.loanApplicationId),
              eq(loanRepayments.status, "pending"),
            ),
          )
          .orderBy(loanRepayments.installmentNumber)
          .limit(1);

        if (pendingRepayment.length > 0) {
          await db
            .update(loanRepayments)
            .set({
              status: "paid",
              paidAmount: amount.toFixed(2),
              paidAt: new Date(),
              payrunId: id,
              payrunItemId: loan.payrunItemId,
              balanceAfter: newRemainingBalance.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(loanRepayments.id, pendingRepayment[0].id));
        }

        // Update employee deduction remaining amount
        if (updatedLoan[0]?.employeeDeductionId) {
          await db
            .update(employeeDeductions)
            .set({
              remainingAmount: newRemainingBalance.toFixed(2),
              updatedAt: new Date(),
            })
            .where(
              eq(employeeDeductions.id, updatedLoan[0].employeeDeductionId),
            );
        }

        // Check if loan is fully repaid
        if (newRemainingBalance <= 0) {
          await db
            .update(loanApplications)
            .set({
              status: "completed",
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(loanApplications.id, loan.loanApplicationId));

          // Deactivate the employee deduction
          if (updatedLoan[0]?.employeeDeductionId) {
            await db
              .update(employeeDeductions)
              .set({
                active: false,
                effectiveTo: new Date(),
                updatedAt: new Date(),
              })
              .where(
                eq(employeeDeductions.id, updatedLoan[0].employeeDeductionId),
              );
          }
        }
      }
    }

    revalidatePath(pathname);
    revalidatePath("/finance/payruns");

    return {
      success: { reason: "Payrun completed successfully" },
      error: null,
    };
  } catch (_error) {
    return {
      error: { reason: "Failed to complete payrun" },
      success: null,
    };
  }
}

export async function rollbackPayrun(id: number, pathname: string) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const payrunData = await db
      .select({ status: payrun.status })
      .from(payrun)
      .where(eq(payrun.id, id))
      .limit(1);

    if (payrunData.length === 0) {
      return {
        error: { reason: "Payrun not found" },
        success: null,
      };
    }

    if (
      payrunData[0].status === "paid" ||
      payrunData[0].status === "completed"
    ) {
      return {
        error: { reason: "Completed payruns cannot be rolled back" },
        success: null,
      };
    }

    // Delete the payrun (cascade will delete items and details)
    await db.delete(payrun).where(eq(payrun.id, id));

    revalidatePath(pathname);
    revalidatePath("/finance/payruns");

    return {
      success: { reason: "Payrun rolled back successfully" },
      error: null,
    };
  } catch (_error) {
    return {
      error: { reason: "Failed to rollback payrun" },
      success: null,
    };
  }
}

export async function getApprovedPayruns() {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const payruns = await db
      .select({
        id: payrun.id,
        name: payrun.name,
        type: payrun.type,
        allowanceName: allowances.name,
        day: payrun.day,
        month: payrun.month,
        year: payrun.year,
        totalEmployees: payrun.totalEmployees,
        totalGrossPay: payrun.totalGrossPay,
        totalDeductions: payrun.totalDeductions,
        totalNetPay: payrun.totalNetPay,
        status: payrun.status,
        generatedByName: employees.name,
        approvedAt: payrun.approvedAt,
        createdAt: payrun.createdAt,
      })
      .from(payrun)
      .leftJoin(allowances, eq(payrun.allowanceId, allowances.id))
      .leftJoin(employees, eq(payrun.generatedBy, employees.id))
      .where(or(eq(payrun.status, "approved"), eq(payrun.status, "paid")))
      .orderBy(desc(payrun.approvedAt));

    return payruns;
  } catch (_error) {
    return [];
  }
}

export async function getAllAllowances() {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    return await db
      .select({
        id: allowances.id,
        name: allowances.name,
        type: allowances.type,
      })
      .from(allowances)
      .orderBy(allowances.name);
  } catch (_error) {
    return [];
  }
}
