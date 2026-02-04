/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";
import { format } from "date-fns";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AskHrForm } from "./ask-hr-form";
import {
  ArrowUpDown,
  Eye,
  FileQuestion,
  Filter,
  Plus,
  RefreshCw,
  Search,
  User,
} from "lucide-react";

import { getAskHrQuestions } from "@/actions/hr/ask-hr";
import { getUser } from "@/actions/auth/dal";

export default function AskHrTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current user to determine view mode
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => getUser(),
  });

  const isHrAdmin =
    currentUser?.department === "HR" || currentUser?.role === "admin";

  // Parse URL params
  const initialCategory = searchParams.get("category") || "all";
  const initialStatus = searchParams.get("status") || "all";
  const initialSearch = searchParams.get("search") || "";
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialTab = searchParams.get("tab") || (isHrAdmin ? "all" : "mine");

  // State
  const [category, setCategory] = useState(initialCategory);
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);
  const [activeTab, setActiveTab] = useState(initialTab);

  // Debounce search to avoid too many queries
  const [debouncedSearch] = useDebounce(search, 300);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (status !== "all") params.set("status", status);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (page > 1) params.set("page", String(page));
    if (activeTab !== "mine") params.set("tab", activeTab);

    router.replace(`/hr/ask-hr?${params.toString()}`);
  }, [category, status, debouncedSearch, page, activeTab, router]);

  // Build query parameters based on filters and user role
  const queryParams = useMemo(() => {
    const params: any = {
      page,
      limit: 10,
      search: debouncedSearch,
    };

    if (category !== "all") params.category = category;
    if (status !== "all") params.status = status;

    // Tab-specific filters
    if (activeTab === "mine") {
      params.onlyMine = true;
    } else if (activeTab === "redirected") {
      params.includeRedirected = true;
    } else if (activeTab === "public") {
      params.publicOnly = true;
    }

    return params;
  }, [category, status, debouncedSearch, page, activeTab]);

  // Fetch data with TanStack Query
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["ask-hr-questions", queryParams],
    queryFn: () => getAskHrQuestions(queryParams),
    enabled: !!currentUser,
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [category, status, debouncedSearch, activeTab]);

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "default";
      case "In Progress":
        return "default";
      case "Redirected":
        return "secondary";
      case "Answered":
        return "outline";
      case "Closed":
        return "secondary";
      default:
        return "default";
    }
  };

  // Render pagination links
  const renderPagination = () => {
    if (!data || data.total <= 0) return null;

    const totalPages = data.totalPages || 1;
    if (totalPages <= 1) return null;

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            />
          </PaginationItem>

          {Array.from({ length: totalPages }).map((_, i) => {
            const pageNumber = i + 1;
            // Show current page, first, last, and pages around current
            if (
              pageNumber === 1 ||
              pageNumber === totalPages ||
              (pageNumber >= page - 1 && pageNumber <= page + 1)
            ) {
              return (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    isActive={page === pageNumber}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              );
            }

            // Show ellipsis for breaks in sequence
            if (pageNumber === 2 || pageNumber === totalPages - 1) {
              return (
                <PaginationItem key={`ellipsis-${pageNumber}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }

            return null;
          })}

          <PaginationItem>
            <PaginationNext
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with title and action buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileQuestion className="h-6 w-6" /> Ask HR
        </h1>
        <AskHrForm
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Ask a Question
            </Button>
          }
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tabs for different views */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="mine">My Questions</TabsTrigger>
              <TabsTrigger value="public">Public Questions</TabsTrigger>
              {isHrAdmin && (
                <TabsTrigger value="all">All Questions</TabsTrigger>
              )}
              <TabsTrigger value="redirected">Redirected</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filter controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-[250px]"
              />
            </div>

            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Benefits">Benefits</SelectItem>
                    <SelectItem value="Payroll">Payroll</SelectItem>
                    <SelectItem value="Leave">Leave</SelectItem>
                    <SelectItem value="Employment">Employment</SelectItem>
                    <SelectItem value="Workplace">Workplace</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Redirected">Redirected</SelectItem>
                    <SelectItem value="Answered">Answered</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          {/* Questions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  {isHrAdmin && <TableHead>Submitted By</TableHead>}
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Skeleton loading state
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell>
                        <Skeleton className="h-5 w-[250px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-[100px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-[80px]" />
                      </TableCell>
                      {isHrAdmin && (
                        <TableCell>
                          <Skeleton className="h-5 w-[120px]" />
                        </TableCell>
                      )}
                      <TableCell>
                        <Skeleton className="h-5 w-[80px]" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-8 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.questions?.length ? (
                  // Questions data
                  data.questions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {question.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{question.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(question.status)}>
                          {question.status}
                        </Badge>
                      </TableCell>
                      {isHrAdmin && (
                        <TableCell>
                          {question.isAnonymous ? (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" /> Anonymous
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> {question.authorName}
                            </span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        {format(new Date(question.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/hr/ask-hr/${question.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  // No results
                  <TableRow>
                    <TableCell
                      colSpan={isHrAdmin ? 6 : 5}
                      className="h-24 text-center"
                    >
                      No questions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-4">{renderPagination()}</div>
        </CardContent>
      </Card>
    </div>
  );
}
