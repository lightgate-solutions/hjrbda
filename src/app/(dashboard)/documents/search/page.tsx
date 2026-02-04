/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use client";

import { SearchResults } from "@/components/documents/search/search-results";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    setIsSearching(true);
    e.preventDefault();
    try {
      const formData = new FormData(e.target as any);
      const query = formData.get("search");

      if (query === "") {
        toast.error("Searching with an empty string is not allowed");
        return;
      }

      const res = await fetch(`/api/upstash/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setSearchResults(data || []);
    } catch (_error) {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-bold text-balance">
                Search Documents
              </h1>
            </div>
          </div>
          <form
            onSubmit={(e) => onSubmit(e)}
            className="relative max-w-7xl flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                name="search"
                placeholder="Search for Title, Description, Tag..."
                className="pl-12 h-14 text-lg"
              />
            </div>
            <Button
              size="lg"
              type="submit"
              className="h-14 hover:cursor-pointer px-8"
              disabled={isSearching}
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </form>
        </div>
      </div>

      <SearchResults results={searchResults} />
    </div>
  );
}
