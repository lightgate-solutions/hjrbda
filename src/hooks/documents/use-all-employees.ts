"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface Employee {
  id: number;
  name: string | null;
  email: string | null;
  department: string | null;
}

interface AllEmployeesResponse {
  employees: Employee[];
}

export function useAllEmployees(enabled = true) {
  return useQuery({
    queryKey: ["all-employees"],
    queryFn: async () => {
      const { data } = await axios.get<AllEmployeesResponse>(
        "/api/documents/employees/all",
      );
      return data.employees;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
