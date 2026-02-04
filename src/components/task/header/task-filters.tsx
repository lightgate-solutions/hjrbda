"use client";

import * as React from "react";
import {
  SlidersHorizontal,
  Check,
  Layers,
  Stars,
  InfoIcon,
  Hexagon,
  Minus,
  Users,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

const priorities = [
  { id: "all", name: "All priorities", icon: Layers },
  { id: "Urgent", name: "Urgent", icon: Stars, color: "text-pink-500" },
  { id: "High", name: "High", icon: InfoIcon, color: "text-red-500" },
  { id: "Medium", name: "Medium", icon: Hexagon, color: "text-cyan-500" },
  { id: "Low", name: "Low", icon: Minus, color: "text-gray-400" },
];

const assigneeOptions = [
  { id: "all", name: "All assignees", icon: Users },
  { id: "me", name: "Assigned to me", icon: User },
];

interface TaskFiltersProps {
  priority: string;
  assignee: string;
  onPriorityChange: (priority: string) => void;
  onAssigneeChange: (assignee: string) => void;
  role?: "employee" | "manager" | "admin" | "self";
}

export function TaskFilters({
  priority,
  assignee,
  onPriorityChange,
  onAssigneeChange,
  role,
}: TaskFiltersProps) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const hasFilters =
    priority !== "all" || (role !== "self" && assignee !== "all");

  if (!mounted) {
    return (
      <Button variant="secondary" size="sm" className="sm:gap-2">
        <SlidersHorizontal className="size-4" />
        <span className="hidden sm:inline">Filter</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasFilters ? "default" : "secondary"}
          size="sm"
          className="sm:gap-2"
        >
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Filter</span>
          {hasFilters && (
            <span className="ml-1 rounded-full bg-background text-foreground px-1.5 text-xs">
              {(priority !== "all" ? 1 : 0) +
                (role !== "self" && assignee !== "all" ? 1 : 0)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Layers className="size-4 text-muted-foreground" />
              Priority
            </h4>
            <div className="space-y-1">
              {priorities.map((p) => {
                const Icon = p.icon;
                return (
                  <Button
                    key={p.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between h-9 px-3"
                    onClick={() => onPriorityChange(p.id)}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`size-4 ${p.color || "text-muted-foreground"}`}
                      />
                      <span className="text-sm">{p.name}</span>
                    </div>
                    {priority === p.id && (
                      <Check className="size-4 text-primary" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {role !== "self" && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  Assignee
                </h4>
                <div className="space-y-1">
                  {assigneeOptions.map((a) => {
                    const Icon = a.icon;
                    return (
                      <Button
                        key={a.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-9 px-3"
                        onClick={() => onAssigneeChange(a.id)}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="size-4 text-muted-foreground" />
                          <span className="text-sm">{a.name}</span>
                        </div>
                        {assignee === a.id && (
                          <Check className="size-4 text-primary" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <Separator />

          <Button
            variant="outline"
            size="sm"
            className="w-full h-9"
            onClick={() => {
              onPriorityChange("all");
              if (role !== "self") {
                onAssigneeChange("all");
              }
            }}
          >
            Clear all filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
