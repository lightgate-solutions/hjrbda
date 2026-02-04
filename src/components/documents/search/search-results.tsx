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
import { Eye, Search } from "lucide-react";
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

export function SearchResults({ results }: { results: SearchResultType[] }) {
  return (
    <div>
      {results.length < 1 ? (
        <div className="flex flex-col items-center justify-center py-4 px-4">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
            <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 p-8 rounded-full">
              <Search className="h-16 w-16 text-primary" strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-balance text-center">
            Start Your Search
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-6 text-balance">
            Enter keywords, document title, or tags to find what you're looking
            for across all documents
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              About {results.length} results
            </p>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="">Department</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, idx) => (
                  <TableRow
                    key={idx}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-black">
                      {result.content.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-md truncate">
                      {result.content.description
                        ? result.content.description
                        : "No description"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {result.content.tags.map((tag, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {result.metadata.department}
                    </TableCell>
                    <TableCell className="text-right capitalize">
                      <Link
                        href={`/documents/${Number(result.metadata.documentId)}`}
                      >
                        <Button variant="link" className="hover:cursor-pointer">
                          <Eye size={16} />
                          Open
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
