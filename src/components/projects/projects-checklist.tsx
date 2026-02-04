"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

export function ProjectsChecklist() {
  const [items, setItems] = useState([
    {
      id: 1,
      label: "Create/edit/delete projects with budget fields.",
      done: false,
    },
    {
      id: 2,
      label: "Add tasks & milestones, mark progress, assign owners.",
      done: false,
    },
    {
      id: 3,
      label: "Budget vs actual reports per project; export CSV.",
      done: false,
    },
    {
      id: 4,
      label: "Upload project photos with geo coordinates & timestamp.",
      done: false,
    },
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acceptance Criteria Checklist</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3">
              <Checkbox
                checked={item.done}
                onCheckedChange={(v) =>
                  setItems((prev) =>
                    prev.map((p) =>
                      p.id === item.id ? { ...p, done: Boolean(v) } : p,
                    ),
                  )
                }
              />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
