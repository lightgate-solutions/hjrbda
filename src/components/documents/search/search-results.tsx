/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, FileText, Search } from "lucide-react";
import Link from "next/link";

interface SearchResultType {
  id: string;
  content: {
    title: string;
    description: string;
    tags: { name: string }[];
  };
  metadata: {
    department: string;
    documentId: string;
  };
}

export function SearchResults({
  results,
  hasSearched = false,
}: {
  results: SearchResultType[];
  hasSearched?: boolean;
}) {
  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-5 mb-5">
          <Search
            size={28}
            className="text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
        <h2 className="text-lg font-medium text-foreground mb-1">
          Start your search
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Enter keywords, document title, or tags to find documents across your
          organization
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-5 mb-5">
          <FileText
            size={28}
            className="text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
        <h2 className="text-lg font-medium text-foreground mb-1">
          No results found
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Try adjusting your search terms or check for typos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {results.length} result{results.length !== 1 ? "s" : ""} found
      </p>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Title
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                Description
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                Tags
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                Department
              </TableHead>
              <TableHead className="text-right w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result, idx) => (
              <TableRow
                key={idx}
                className="cursor-pointer transition-colors hover:bg-muted/40"
              >
                <TableCell>
                  <span className="text-sm font-medium">
                    {result.content.title}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell max-w-xs">
                  <span className="text-sm text-muted-foreground truncate block">
                    {result.content.description || "No description"}
                  </span>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex gap-1 flex-wrap">
                    {result.content.tags.map((tag, tagIdx) => (
                      <Badge
                        key={tagIdx}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground capitalize">
                    {result.metadata.department}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/documents/${Number(result.metadata.documentId)}`}
                    aria-label={`Open ${result.content.title}`}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Eye size={14} aria-hidden="true" />
                      <span className="hidden sm:inline">Open</span>
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
