"use server";

import { db } from "@/db";
import { eq, isNull, asc, and } from "drizzle-orm";
import { getUser } from "../auth/dal";
import { employees } from "@/db/schema/hr";
import {
  employeeSalary,
  salaryStructure,
  allowances,
  deductions,
  employeeAllowances,
  employeeDeductions,
  salaryAllowances,
  salaryDeductions,
} from "@/db/schema/payroll";

export async function getAllEmployeesWithPayroll() {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    // Get all employees
    const allEmployees = await db
      .select({
        id: employees.id,
        name: employees.name,
        staffNumber: employees.staffNumber,
        department: employees.department,
        role: employees.role,
        email: employees.email,
        status: employees.status,
      })
      .from(employees)
      .orderBy(asc(employees.name));

    // Get all active salary assignments for employees
    const activeSalaryAssignments = await db
      .select({
        employeeId: employeeSalary.employeeId,
        salaryId: employeeSalary.id,
        structureId: salaryStructure.id,
        structureName: salaryStructure.name,
        baseSalary: salaryStructure.baseSalary,
        effectiveFrom: employeeSalary.effectiveFrom,
      })
      .from(employeeSalary)
      .innerJoin(
        salaryStructure,
        eq(employeeSalary.salaryStructureId, salaryStructure.id),
      )
      .where(isNull(employeeSalary.effectiveTo));

    // Create lookup map for employee salaries
    const salaryMap = new Map();
    for (const assignment of activeSalaryAssignments) {
      salaryMap.set(assignment.employeeId, {
        salaryId: assignment.salaryId,
        structureId: assignment.structureId,
        structureName: assignment.structureName,
        baseSalary: assignment.baseSalary,
        effectiveFrom: assignment.effectiveFrom,
      });
    }

    // Combine employee data with their current salary structure
    const employeesWithPayroll = allEmployees.map((employee) => {
      const salaryInfo = salaryMap.get(employee.id);
      return {
        ...employee,
        salaryId: salaryInfo?.salaryId || null,
        structureId: salaryInfo?.structureId || null,
        structureName: salaryInfo?.structureName || null,
        baseSalary: salaryInfo?.baseSalary || null,
        effectiveFrom: salaryInfo?.effectiveFrom || null,
      };
    });

    return employeesWithPayroll;
  } catch (_error) {
    return [];
  }
}

/**
 * Calculates the take-home pay for an employee based on their salary structure
 * and applicable allowances and deductions
 */
export async function calculateEmployeeTakeHomePay(employeeId: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");
  if (user.role !== "admin") throw new Error("Access Restricted");

  try {
    const employeeSalaryInfo = await db
      .select({
        employeeId: employeeSalary.employeeId,
        salaryStructureId: employeeSalary.salaryStructureId,
        structureName: salaryStructure.name,
        baseSalary: salaryStructure.baseSalary,
      })
      .from(employeeSalary)
      .innerJoin(
        salaryStructure,
        eq(employeeSalary.salaryStructureId, salaryStructure.id),
      )
      .where(
        and(
          eq(employeeSalary.employeeId, employeeId),
          isNull(employeeSalary.effectiveTo),
        ),
      )
      .limit(1);

    if (employeeSalaryInfo.length === 0) {
      return {
        baseSalary: 0,
        allowances: [],
        deductions: [],
        totalAllowances: 0,
        totalDeductions: 0,
        grossPay: 0,
        netPay: 0,
      };
    }

    const { baseSalary, salaryStructureId } = employeeSalaryInfo[0];
    const baseSalaryNumber = Number(baseSalary);

    const structureAllowances = await db
      .select({
        id: allowances.id,
        name: allowances.name,
        type: allowances.type,
        amount: allowances.amount,
        percentage: allowances.percentage,
        taxable: allowances.taxable,
        taxPercentage: allowances.taxPercentage,
      })
      .from(salaryAllowances)
      .innerJoin(allowances, eq(salaryAllowances.allowanceId, allowances.id))
      .where(
        and(
          eq(salaryAllowances.salaryStructureId, salaryStructureId),
          isNull(salaryAllowances.effectiveTo),
        ),
      );

    // Get structure deductions
    const structureDeductions = await db
      .select({
        id: deductions.id,
        name: deductions.name,
        type: deductions.type,
        amount: deductions.amount,
        percentage: deductions.percentage,
      })
      .from(salaryDeductions)
      .innerJoin(deductions, eq(salaryDeductions.deductionId, deductions.id))
      .where(
        and(
          eq(salaryDeductions.salaryStructureId, salaryStructureId),
          isNull(salaryDeductions.effectiveTo),
        ),
      );

    // Get employee specific allowances
    const employeeSpecificAllowances = await db
      .select({
        id: allowances.id,
        name: allowances.name,
        type: allowances.type,
        amount: allowances.amount,
        percentage: allowances.percentage,
        taxable: allowances.taxable,
        taxPercentage: allowances.taxPercentage,
      })
      .from(employeeAllowances)
      .innerJoin(allowances, eq(employeeAllowances.allowanceId, allowances.id))
      .where(
        and(
          eq(employeeAllowances.employeeId, employeeId),
          isNull(employeeAllowances.effectiveTo),
        ),
      );

    // Get employee specific deductions
    const employeeSpecificDeductions = await db
      .select({
        id: employeeDeductions.id,
        name: employeeDeductions.name,
        amount: employeeDeductions.amount,
        percentage: employeeDeductions.percentage,
      })
      .from(employeeDeductions)
      .where(
        and(
          eq(employeeDeductions.employeeId, employeeId),
          eq(employeeDeductions.active, true),
          isNull(employeeDeductions.effectiveTo),
        ),
      );

    // Calculate total allowance amount with taxes
    const allowancesWithValue = [
      ...structureAllowances,
      ...employeeSpecificAllowances,
    ].map((allowance) => {
      const grossValue = allowance.percentage
        ? (Number(allowance.percentage) / 100) * baseSalaryNumber
        : Number(allowance.amount || 0);

      // Calculate tax if the allowance is taxable
      const taxAmount =
        allowance.taxable && allowance.taxPercentage
          ? (Number(allowance.taxPercentage) / 100) * grossValue
          : 0;

      const netValue = grossValue - taxAmount;

      return {
        ...allowance,
        calculatedGross: grossValue,
        taxAmount: taxAmount,
        calculatedValue: netValue, // Net after tax
      };
    });

    // Calculate total deduction amount
    // Create a Map to track deductions by name to prevent duplicates
    const deductionsMap = new Map();

    // Process structure deductions first
    structureDeductions.forEach((deduction) => {
      const value = deduction.percentage
        ? (Number(deduction.percentage) / 100) * baseSalaryNumber
        : Number(deduction.amount || 0);

      deductionsMap.set(deduction.name, {
        ...deduction,
        calculatedValue: value,
        source: "structure",
      });
    });

    // Then process employee-specific deductions, which will override structure deductions with the same name
    employeeSpecificDeductions.forEach((deduction) => {
      const value = deduction.percentage
        ? (Number(deduction.percentage) / 100) * baseSalaryNumber
        : Number(deduction.amount || 0);

      deductionsMap.set(deduction.name, {
        ...deduction,
        calculatedValue: value,
        source: "employee",
      });
    });

    // Convert the Map values back to an array
    const deductionsWithValue = Array.from(deductionsMap.values());

    // Sum of gross allowances (before tax)
    const totalGrossAllowances = allowancesWithValue.reduce(
      (sum, item) => sum + item.calculatedGross,
      0,
    );

    // Sum of taxes on allowances
    const totalAllowanceTaxes = allowancesWithValue.reduce(
      (sum, item) => sum + item.taxAmount,
      0,
    );

    // Sum of net allowances (after tax)
    const totalNetAllowances = allowancesWithValue.reduce(
      (sum, item) => sum + item.calculatedValue,
      0,
    );

    // Sum of deductions
    const totalDeductions = deductionsWithValue.reduce(
      (sum, item) => sum + item.calculatedValue,
      0,
    );

    // Gross pay includes base salary plus gross allowances
    const grossPay = baseSalaryNumber + totalGrossAllowances;

    // Calculate taxable income
    const taxableIncome = grossPay;

    // Net pay is gross minus taxes and deductions
    const netPay = grossPay - totalAllowanceTaxes - totalDeductions;

    return {
      baseSalary: baseSalaryNumber,
      allowances: allowancesWithValue,
      deductions: deductionsWithValue,
      totalGrossAllowances,
      totalNetAllowances,
      totalAllowances: totalNetAllowances, // For backward compatibility
      totalAllowanceTaxes,
      totalDeductions,
      taxableIncome,
      grossPay,
      netPay,
    };
  } catch (_error) {
    return null;
  }
}
