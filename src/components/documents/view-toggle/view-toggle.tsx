"use client";

import { LayoutGrid, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ButtonGroup } from "@/components/ui/button-group";

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
    <ButtonGroup>
      <Button
        variant={currentView === "card" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setView("card")}
        className="h-8 px-3"
      >
        <LayoutGrid size={16} className="mr-1" />
        Card
      </Button>
      <Button
        variant={currentView === "table" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setView("table")}
        className="h-8 px-3"
      >
        <Table size={16} className="mr-1" />
        Table
      </Button>
    </ButtonGroup>
  );
}
