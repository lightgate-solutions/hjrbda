"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface Employee {
  id: number;
  name: string | null;
  email: string | null;
  department: string | null;
}

interface SearchEmployeesResponse {
  employees: Employee[];
}

export function useSearchEmployees(query: string, limit = 8, enabled = true) {
  return useQuery({
    queryKey: ["search-employees", query, limit],
    queryFn: async () => {
      const { data } = await axios.get<SearchEmployeesResponse>(
        "/api/documents/employees/search",
        {
          params: { q: query, limit },
        },
      );
      return data.employees;
    },
    enabled: enabled && query.trim().length > 0,
    staleTime: 60 * 1000, // 1 minute
  });
}
