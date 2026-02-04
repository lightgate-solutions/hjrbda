"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getEmployeeSalaryHistory } from "@/actions/payroll/employee-salary";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Props = {
  trigger: React.ReactNode;
  employeeId: number;
  employeeName: string;
};
interface HistoryDataType {
  id: number;
  salaryStructureId: number;
  structureName: string | null;
  baseSalary: string | null;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
}

export function EmployeeSalaryHistory({
  trigger,
  employeeId,
  employeeName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryDataType[]>([]);

  useEffect(() => {
    if (!open) {
      setHistory([]);
      return;
    }

    const loadHistory = async () => {
      setLoading(true);
      try {
        const historyData = await getEmployeeSalaryHistory(employeeId);
        setHistory(historyData);
      } catch (_error) {
        toast.error("Failed to load salary history:");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [open, employeeId]);

  const formatDate = (date: Date | null) => {
    return date ? date.toLocaleDateString() : "-";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Salary History for {employeeName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            <div className="h-8 bg-muted animate-pulse rounded w-1/3"></div>
            <div className="h-72 bg-muted animate-pulse rounded"></div>
          </div>
        ) : (
          <div>
            {history.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No salary history found for this employee.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Structure</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.structureName}</TableCell>
                      <TableCell>
                        {formatCurrency(Number(item.baseSalary))}
                      </TableCell>
                      <TableCell>{formatDate(item.effectiveFrom)}</TableCell>
                      <TableCell>
                        {item.effectiveTo
                          ? formatDate(item.effectiveTo)
                          : "Present"}
                      </TableCell>
                      <TableCell>
                        {item.effectiveTo ? (
                          <Badge variant="outline">Past</Badge>
                        ) : (
                          <Badge variant="default">Current</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
