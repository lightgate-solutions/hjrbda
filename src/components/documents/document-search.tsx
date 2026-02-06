"use client";

import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

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
    <div className="relative w-full max-w-sm group">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        placeholder={placeholder}
        className="pl-9 pr-8 h-9 bg-muted/40 border-border transition-all duration-200 focus:bg-background focus:shadow-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
