"use client";

import { LayoutGrid, List } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type ViewType = "card" | "table";

export function ViewToggle() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentView = (searchParams?.get("view") as ViewType) ?? "table";

  const setView = (view: ViewType) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("view", view);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
      <button
        type="button"
        onClick={() => setView("table")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
          currentView === "table"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Switch to table view"
        aria-pressed={currentView === "table"}
      >
        <List size={15} aria-hidden="true" />
        <span className="hidden sm:inline">List</span>
      </button>
      <button
        type="button"
        onClick={() => setView("card")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
          currentView === "card"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label="Switch to grid view"
        aria-pressed={currentView === "card"}
      >
        <LayoutGrid size={15} aria-hidden="true" />
        <span className="hidden sm:inline">Grid</span>
      </button>
    </div>
  );
}
