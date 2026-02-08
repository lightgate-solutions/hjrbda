"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, Receipt, Banknote } from "lucide-react";

export function ProjectsCards() {
  const [stats, setStats] = useState<{
    total: number;
    actual: number;
    expenses: number;
  } | null>(null);
  const [filters, setFilters] = useState<{ q?: string; status?: string }>({});

  useEffect(() => {
    let mounted = true;
    async function load(next?: { q?: string; status?: string }) {
      const q = next?.q ?? filters.q ?? "";
      // Always filter by in-progress status for cards (ongoing projects only)
      const status = "";
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("status", status);
      const res = await fetch(`/api/projects/stats?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (mounted) setStats(data);
    }
    load();
    const handler = () => load();
    const filtersHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      setFilters(detail);
      load(detail);
    };
    window.addEventListener("projects:changed", handler);
    window.addEventListener(
      "projects:filters",
      filtersHandler as EventListener,
    );
    return () => {
      mounted = false;
      window.removeEventListener("projects:changed", handler);
      window.removeEventListener(
        "projects:filters",
        filtersHandler as EventListener,
      );
    };
  }, [filters.q]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="relative overflow-hidden border-none bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg transition-all hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-blue-100">
            Total Projects
          </CardTitle>
          <div className="rounded-full bg-white/20 p-2">
            <Folder className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats?.total ?? 0}</div>
          <p className="text-xs text-blue-100 mt-1">All projects</p>
        </CardContent>
        <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      </Card>

      <Card className="relative overflow-hidden border-none bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg transition-all hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-emerald-100">
            Budget Planned
          </CardTitle>
          <div className="rounded-full bg-white/20 p-2">
            <Banknote className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            ₦{(stats?.actual ?? 0).toLocaleString()}
          </div>
          <p className="text-xs text-emerald-100 mt-1">Ongoing projects only</p>
        </CardContent>
        <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      </Card>

      <Card className="relative overflow-hidden border-none bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg transition-all hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-amber-100">
            Expenses
          </CardTitle>
          <div className="rounded-full bg-white/20 p-2">
            <Receipt className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            ₦{(stats?.expenses ?? 0).toLocaleString()}
          </div>
          <p className="text-xs text-amber-100 mt-1">Ongoing projects only</p>
        </CardContent>
        <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      </Card>
    </div>
  );
}
