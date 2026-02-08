"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface Expense {
  id: number;
  projectId: number;
  title: string;
  amount: number;
  spentAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ExpensesResponse {
  expenses: Expense[];
}

export function useProjectExpenses(projectId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["project-expenses", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Project ID is required");
      const { data } = await axios.get<ExpensesResponse>(
        `/api/projects/${projectId}/expenses`,
      );
      return data.expenses;
    },
    enabled: enabled && projectId !== null,
    staleTime: 30 * 1000, // 30 seconds
  });
}
