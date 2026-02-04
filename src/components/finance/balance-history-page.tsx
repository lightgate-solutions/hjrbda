"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";
import { toast } from "sonner";

type Transaction = {
  id: number;
  amount: string;
  transactionType: string;
  description: string | null;
  balanceBefore: string;
  balanceAfter: string;
  createdAt: string;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
};

export function BalanceHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, _setLimit] = useState(20);
  const [transactionType, setTransactionType] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam = transactionType === "all" ? "" : transactionType;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (typeParam) params.append("type", typeParam);
      const res = await fetch(
        `/api/finance/balance/transactions?${params.toString()}`,
      );
      const data = await res.json();
      setTransactions(data.transactions ?? []);
      setTotal(data.total ?? 0);
    } catch (_error) {
      toast.error("Error loading transactions:");
    } finally {
      setLoading(false);
    }
  }, [page, limit, transactionType]);

  useEffect(() => {
    loadTransactions();
    // Refresh when balance changes
    const handleBalanceChange = () => {
      loadTransactions();
    };
    window.addEventListener("expenses:changed", handleBalanceChange);
    return () => {
      window.removeEventListener("expenses:changed", handleBalanceChange);
    };
  }, [loadTransactions]);

  const formatCurrency = (amount: string) => {
    const num = Number(amount);
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case "top-up":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-300">
            Top-up
          </Badge>
        );
      case "expense":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100/80 dark:bg-red-900/30 dark:text-red-300">
            Expense
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="capitalize">
            {type}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Balance History
            </h1>
            <p className="text-sm text-muted-foreground">
              View all balance transactions and history
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transactions</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={transactionType}
                onValueChange={(v) => {
                  setTransactionType(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="All types" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="top-up">Top-ups</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                  <SelectItem value="adjustment">Adjustments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Balance Before</TableHead>
                  <TableHead>Balance After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center h-24 text-muted-foreground"
                    >
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id} className="group">
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        {getTransactionTypeBadge(tx.transactionType)}
                      </TableCell>
                      <TableCell
                        className={`font-semibold ${
                          tx.transactionType === "top-up"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {tx.transactionType === "top-up" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {tx.userName || "—"}
                          </div>
                          {tx.userEmail && (
                            <div className="text-xs text-muted-foreground">
                              {tx.userEmail}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {tx.description || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatCurrency(tx.balanceBefore)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatCurrency(tx.balanceAfter)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {total > limit ? (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink isActive href="#">
                    {page}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      const totalPages = Math.max(1, Math.ceil(total / limit));
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
