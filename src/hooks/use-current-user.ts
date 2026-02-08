"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface CurrentUser {
  id: number;
  name: string;
  staffNumber: string | null;
  role: string | null;
  email: string;
  phone: string | null;
  department: string | null;
  managerId: number | null;
  isManager: boolean | null;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await axios.get<{ user: CurrentUser }>("/api/auth/me");
      return data.user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - user info rarely changes
  });
}
