/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardContent } from "@/components/ui/card";
import { searchEmails } from "@/actions/mail/email";
import { toast } from "sonner";

interface SearchResult {
  id: string;
  subject: string;
  body: string;
  createdAt: Date;
  type: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  isRead: boolean;
  folder: string;
}

interface MailSearchProps {
  onResultClick: (emailId: string, folder: string) => void;
}

export function MailSearch({ onResultClick }: MailSearchProps) {
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<
    "inbox" | "sent" | "archive" | "trash" | "all"
  >("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // --- Debounced Search ---
  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    const result = await searchEmails({
      query: query.trim(),
      folder: folder === "all" ? undefined : folder,
    });

    if (result.success) {
      setResults(result?.data ?? []);
      setShowResults(true);
      if (result.data?.length === 0) toast.info("No results found");
    } else {
      toast.error(result.error || "Failed to search emails");
    }

    setIsSearching(false);
  }, [query, folder]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(), 2000);
  }, [query, folder, performSearch]);

  // --- Keyboard navigation ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults) return;

    if (e.key === "ArrowDown") {
      setHighlightIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      setHighlightIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      const selected = results[highlightIndex];
      onResultClick(selected.id, selected.folder);
      setShowResults(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  };

  return (
    <div className="space-y-4">
      {/* Search Controls */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search ..."
            className="pl-9 pr-9"
          />
          {query && (
            <Button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Select value={folder} onValueChange={(value: any) => setFolder(value)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="inbox">Inbox</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="archive">Archive</SelectItem>
            <SelectItem value="trash">Trash</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={performSearch}
          disabled={isSearching || !query.trim()}
          className="gap-2"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Search
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Search Results</DialogTitle>
            <DialogDescription>
              {results.length} result{results.length !== 1 ? "s" : ""} found.
            </DialogDescription>
          </DialogHeader>
          <div className="divide-y border rounded-lg max-h-[60vh] overflow-y-auto scrollbar-thin">
            {results.map((result, idx) => (
              <CardContent
                key={idx}
                onClick={() => {
                  onResultClick(result.id, result.folder);
                  setShowResults(false);
                }}
                className={`p-4 cursor-pointer transition-colors ${
                  highlightIndex === idx ? "bg-muted/70" : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-medium truncate">
                      {result.senderName}
                    </span>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                      {result.folder}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(result.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="font-medium text-sm mb-1 truncate">
                  {result.subject}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {truncateText(result.body, 140)}
                </p>
              </CardContent>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
