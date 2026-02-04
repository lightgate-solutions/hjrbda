"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface DocumentSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DocumentSearch({
  value,
  onChange,
  placeholder = "Search documents...",
}: DocumentSearchProps) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        className="pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
