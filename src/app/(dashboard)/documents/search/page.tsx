/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use client";

import { SearchResults } from "@/components/documents/search/search-results";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

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

export default function Home() {
  const [searchResults, setSearchResults] = useState<SearchResultType[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    setIsSearching(true);
    e.preventDefault();
    try {
      const formData = new FormData(e.target as any);
      const query = formData.get("search");

      if (query === "") {
        toast.error("Please enter a search term");
        return;
      }

      const res = await fetch("/api/upstash/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setSearchResults(data || []);
      setHasSearched(true);
    } catch (_error) {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 pt-2">
        <div className="flex items-center gap-3">
          <Link
            href="/documents"
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Back to documents"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Search Documents
            </h1>
            <p className="text-sm text-muted-foreground">
              Find documents by title, description, or tags
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={(e) => onSubmit(e)} className="flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              name="search"
              placeholder="Search for title, description, tag..."
              className="pl-10 h-10 text-sm bg-muted/40 border-border focus:bg-background focus:shadow-sm"
              aria-label="Search documents"
            />
          </div>
          <Button type="submit" className="h-10 px-6" disabled={isSearching}>
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </form>
      </div>

      {/* Results */}
      <SearchResults results={searchResults} hasSearched={hasSearched} />
    </div>
  );
}
