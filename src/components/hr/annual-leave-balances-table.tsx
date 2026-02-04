/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Edit, Trash2, Settings, Plus, User } from "lucide-react";
import { toast } from "sonner";
import AnnualLeaveSettingsDialog from "./annual-leave-settings-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

export default function AnnualLeaveBalancesTable() {
  const [selectedSetting, setSelectedSetting] = useState<any | null>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  const queryClient = useQueryClient();

  // Fetch global annual leave settings
  const { data: settings = [] } = useQuery({
    queryKey: ["annual-leave-settings"],
    queryFn: async () => {
      const response = await fetch("/api/hr/leaves/annual-settings");
      const data = await response.json();
      return data.settings || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["annual-leave-balances", page],
    queryFn: async () => {
      const response = await fetch(
        `/api/hr/leaves/balances/annual?page=${page}&limit=${limit}`,
      );
      const data = await response.json();
      return data;
    },
  });

  const balances = data?.balances || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const _getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <section className="space-y-8">
      {/* Global Annual Leave Settings */}
      <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-card to-muted/20">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Annual Leave Settings
              </CardTitle>
              <CardDescription>
                Set the global annual leave allocation for all employees
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setSelectedSetting(null);
                setShowSettingsDialog(true);
              }}
              className="shadow-sm transition-all hover:shadow-md"
            >
              <Plus className="mr-2 h-4 w-4" />
              Set Allocation
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {settings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Settings className="h-12 w-12 mb-4 opacity-20" />
              <p>No annual leave settings configured.</p>
              <Button
                variant="link"
                onClick={() => setShowSettingsDialog(true)}
                className="mt-2"
              >
                Set the allocation now
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">Year</TableHead>
                  <TableHead>Allocated Days</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.map((setting: any) => (
                  <TableRow
                    key={setting.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-bold text-primary">
                      {setting.year}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="font-mono text-sm px-3 py-1"
                      >
                        {setting.allocatedDays} days
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {setting.description ? (
                        <span className="text-sm">{setting.description}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">
                          No description
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 hover:bg-background hover:text-primary transition-colors"
                          onClick={() => {
                            setSelectedSetting(setting);
                            setShowSettingsDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 hover:bg-background hover:text-destructive transition-colors"
                          onClick={async () => {
                            if (
                              !confirm(
                                "Are you sure you want to delete this annual leave setting?",
                              )
                            ) {
                              return;
                            }

                            try {
                              const response = await fetch(
                                `/api/hr/leaves/annual-settings/${setting.id}`,
                                {
                                  method: "DELETE",
                                },
                              );

                              if (!response.ok) {
                                toast.error(
                                  "Failed to delete annual leave setting",
                                );
                                return;
                              }

                              toast.success(
                                "Annual leave setting deleted successfully",
                              );
                              queryClient.invalidateQueries({
                                queryKey: ["annual-leave-settings"],
                              });
                              queryClient.invalidateQueries({
                                queryKey: ["annual-leave-balances"],
                              });
                            } catch (_error) {
                              toast.error(
                                "An error occurred. Please try again.",
                              );
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Employee Balances */}
      <Card className="overflow-hidden border-none shadow-md">
        <CardHeader className="border-b bg-card pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Employee Annual Leave Balances
              </CardTitle>
              <CardDescription>
                View annual leave balances for all employees
              </CardDescription>
            </div>
            {total > 0 && (
              <Badge variant="outline" className="px-3 py-1">
                Total Employees: {total}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {balances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <User className="h-12 w-12 mb-4 opacity-20" />
              <p>No annual leave balances found.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[300px]">Employee</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Usage Progress</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((balance: any) => {
                    const percentageUsed = Math.min(
                      100,
                      Math.round(
                        (balance.usedDays / balance.totalDays) * 100,
                      ) || 0,
                    );

                    return (
                      <TableRow
                        key={balance.id}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-background shadow-sm group-hover:border-primary/20 transition-colors">
                              <AvatarImage
                                src={balance.employeeAvatar}
                                alt={balance.employeeName}
                              />
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {_getInitials(
                                  balance.employeeName || "Unknown",
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">
                                {balance.employeeName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {balance.employeeEmail}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground">
                          {balance.year}
                        </TableCell>
                        <TableCell className="w-[300px]">
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                {balance.usedDays} used
                              </span>
                              <span className="font-medium">
                                {balance.totalDays} total
                              </span>
                            </div>
                            <Progress
                              value={percentageUsed}
                              className="h-2"
                              indicatorClassName={
                                percentageUsed > 80
                                  ? "bg-red-500"
                                  : percentageUsed > 50
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`text-lg font-bold ${
                                balance.remainingDays < 5
                                  ? "text-red-600"
                                  : balance.remainingDays < 10
                                    ? "text-yellow-600"
                                    : "text-green-600"
                              }`}
                            >
                              {balance.remainingDays}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Days Left
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="secondary"
                            className="bg-muted text-muted-foreground hover:bg-muted"
                          >
                            Auto-calculated
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="border-t p-4 bg-muted/10">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className={
                            page === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          (p) =>
                            p === 1 ||
                            p === totalPages ||
                            (p >= page - 1 && p <= page + 1),
                        )
                        .map((p, idx, arr) => (
                          <div key={p} className="flex items-center">
                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                              <PaginationItem>
                                <span className="px-2 text-muted-foreground">
                                  ...
                                </span>
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                onClick={() => setPage(p)}
                                isActive={p === page}
                                className="cursor-pointer"
                              >
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          </div>
                        ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          className={
                            page === totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSetting
                ? "Edit Annual Leave Allocation"
                : "Set Annual Leave Allocation"}
            </DialogTitle>
            <DialogDescription>
              {selectedSetting
                ? "Update the global annual leave allocation for this year"
                : "Set the global annual leave allocation that applies to all employees for a specific year"}
            </DialogDescription>
          </DialogHeader>
          <AnnualLeaveSettingsDialog
            setting={selectedSetting}
            onSuccess={() => {
              setShowSettingsDialog(false);
              setSelectedSetting(null);
              queryClient.invalidateQueries({
                queryKey: ["annual-leave-settings"],
              });
              queryClient.invalidateQueries({
                queryKey: ["annual-leave-balances"],
              });
            }}
            onCancel={() => {
              setShowSettingsDialog(false);
              setSelectedSetting(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
