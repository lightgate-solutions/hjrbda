"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import { CalendarIcon, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Label } from "../ui/label";
import { getOrganization } from "@/actions/organization";
import { addPdfHeader } from "@/lib/pdf-utils";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface ExportItem {
  id: string;
  label: string;
  description: string;
  supportsDateFilter: boolean;
}

interface ExportCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  items: ExportItem[];
}

const exportCategories: ExportCategory[] = [
  {
    id: "hr",
    title: "Human Resources",
    description: "Employee records, attendance, and HR data",
    icon: <FileText className="h-5 w-5" />,
    items: [
      {
        id: "employees",
        label: "Employees",
        description: "All employee records",
        supportsDateFilter: false,
      },
      {
        id: "employee-banks",
        label: "Employee Bank Details",
        description: "Bank account information",
        supportsDateFilter: false,
      },
      {
        id: "employee-documents",
        label: "Employee Documents",
        description: "Uploaded employee documents",
        supportsDateFilter: true,
      },
      {
        id: "attendance",
        label: "Attendance Records",
        description: "Daily attendance logs",
        supportsDateFilter: true,
      },
      {
        id: "leave-applications",
        label: "Leave Applications",
        description: "Leave requests and approvals",
        supportsDateFilter: true,
      },
      {
        id: "leave-balances",
        label: "Leave Balances",
        description: "Current leave balances",
        supportsDateFilter: false,
      },
      {
        id: "ask-hr",
        label: "Ask HR Questions",
        description: "Employee HR inquiries",
        supportsDateFilter: true,
      },
    ],
  },
  {
    id: "payroll",
    title: "Payroll",
    description: "Salary structures, allowances, deductions, and payruns",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    items: [
      {
        id: "salary-structures",
        label: "Salary Structures",
        description: "All salary structure definitions",
        supportsDateFilter: false,
      },
      {
        id: "allowances",
        label: "Allowances",
        description: "Allowance definitions",
        supportsDateFilter: false,
      },
      {
        id: "deductions",
        label: "Deductions",
        description: "Deduction definitions",
        supportsDateFilter: false,
      },
      {
        id: "payruns",
        label: "All Payruns",
        description: "Generated payroll runs",
        supportsDateFilter: true,
      },
      {
        id: "payrun-items",
        label: "Payrun Items",
        description: "Individual payrun entries per employee",
        supportsDateFilter: true,
      },
    ],
  },
  {
    id: "loans",
    title: "Loans",
    description: "Loan applications, types, and repayments",
    icon: <FileText className="h-5 w-5" />,
    items: [
      {
        id: "loan-types",
        label: "Loan Types",
        description: "Available loan type definitions",
        supportsDateFilter: false,
      },
      {
        id: "loans-all",
        label: "All Loans",
        description: "All loan applications",
        supportsDateFilter: true,
      },
      {
        id: "loans-active",
        label: "Active Loans",
        description: "Currently active loans",
        supportsDateFilter: true,
      },
      {
        id: "loans-unpaid",
        label: "Unpaid Loans",
        description: "Loans pending payment",
        supportsDateFilter: true,
      },
      {
        id: "loans-settled",
        label: "Settled Loans",
        description: "Completed/settled loans",
        supportsDateFilter: true,
      },
      {
        id: "loan-repayments",
        label: "Loan Repayments",
        description: "Repayment schedules and history",
        supportsDateFilter: true,
      },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    description: "Projects, tasks, and operational data",
    icon: <FileText className="h-5 w-5" />,
    items: [
      {
        id: "projects",
        label: "All Projects",
        description: "All project records",
        supportsDateFilter: true,
      },
      {
        id: "projects-pending",
        label: "Pending Projects",
        description: "Projects awaiting start",
        supportsDateFilter: true,
      },
      {
        id: "projects-in-progress",
        label: "In-Progress Projects",
        description: "Currently active projects",
        supportsDateFilter: true,
      },
      {
        id: "projects-completed",
        label: "Completed Projects",
        description: "Finished projects",
        supportsDateFilter: true,
      },
      {
        id: "tasks",
        label: "All Tasks",
        description: "All task records",
        supportsDateFilter: true,
      },
      {
        id: "tasks-pending",
        label: "Pending Tasks",
        description: "Tasks not started",
        supportsDateFilter: true,
      },
      {
        id: "tasks-in-progress",
        label: "In-Progress Tasks",
        description: "Tasks currently being worked on",
        supportsDateFilter: true,
      },
      {
        id: "tasks-completed",
        label: "Completed Tasks",
        description: "Finished tasks",
        supportsDateFilter: true,
      },
      {
        id: "tasks-overdue",
        label: "Overdue Tasks",
        description: "Tasks past due date",
        supportsDateFilter: true,
      },
      {
        id: "task-submissions",
        label: "Task Submissions",
        description: "Task submission records",
        supportsDateFilter: true,
      },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    description: "Company expenses and financial transactions",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    items: [
      {
        id: "company-expenses",
        label: "Company Expenses",
        description: "Recorded company expenses",
        supportsDateFilter: true,
      },
      {
        id: "balance-transactions",
        label: "Balance Transactions",
        description: "Financial transaction history",
        supportsDateFilter: true,
      },
    ],
  },
  {
    id: "content",
    title: "Content & Documents",
    description: "News articles and document management",
    icon: <FileText className="h-5 w-5" />,
    items: [
      {
        id: "news",
        label: "News Articles",
        description: "Published news and announcements",
        supportsDateFilter: true,
      },
      {
        id: "documents",
        label: "Documents",
        description: "System documents",
        supportsDateFilter: true,
      },
      {
        id: "document-logs",
        label: "Document Access Logs",
        description: "Document access history",
        supportsDateFilter: true,
      },
    ],
  },
  {
    id: "system",
    title: "System & Users",
    description: "User accounts and activity logs",
    icon: <FileText className="h-5 w-5" />,
    items: [
      {
        id: "users",
        label: "User Accounts",
        description: "All user accounts",
        supportsDateFilter: false,
      },
      {
        id: "user-sessions",
        label: "User Sessions / Login History",
        description: "User login activity",
        supportsDateFilter: true,
      },
    ],
  },
];

const presetPeriods = [
  {
    label: "Last 7 days",
    getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }),
  },
  {
    label: "Last 30 days",
    getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }),
  },
  {
    label: "This month",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: "This year",
    getValue: () => ({
      from: startOfYear(new Date()),
      to: endOfYear(new Date()),
    }),
  },
  { label: "All time", getValue: () => ({ from: undefined, to: undefined }) },
];

export function ExportCenter() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>("all-time");
  const [organization, setOrganization] = useState<{
    name: string;
    logoUrl: string | null;
  } | null>(null);

  useEffect(() => {
    getOrganization().then(({ success }) => {
      if (success) setOrganization(success);
    });
  }, []);

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    const preset = presetPeriods.find(
      (p) => p.label.toLowerCase().replace(/\s+/g, "-") === value,
    );
    if (preset) {
      setDateRange(preset.getValue());
    }
  };

  const handleExport = async (dataset: string, format: "csv" | "pdf") => {
    setLoading(`${dataset}-${format}`);

    try {
      const params = new URLSearchParams({
        dataset,
        format: format === "pdf" ? "json" : "csv",
      });

      if (dateRange.from) {
        params.append("startDate", dateRange.from.toISOString());
      }
      if (dateRange.to) {
        params.append("endDate", dateRange.to.toISOString());
      }

      const response = await fetch(`/api/export?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Export failed");
      }

      if (format === "pdf") {
        const { data } = await response.json();
        await generatePDF(dataset, data);
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${dataset}_export_${format === "csv" ? new Date().toISOString().split("T")[0] : ""}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      toast.success(
        `${dataset} exported successfully as ${format.toUpperCase()}`,
      );
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setLoading(null);
    }
  };

  const generatePDF = async (
    dataset: string,
    data: Record<string, unknown>[],
  ) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({
      orientation:
        data.length > 0 && Object.keys(data[0]).length > 6
          ? "landscape"
          : "portrait",
    });

    const dateInfo =
      dateRange.from && dateRange.to
        ? `${format(dateRange.from, "PP")} - ${format(dateRange.to, "PP")}`
        : "All time";

    // Add header with logo
    let yPosition = await addPdfHeader(doc, {
      organizationName: organization?.name || "HJRBDA",
      logoUrl: organization?.logoUrl,
      documentTitle: `${dataset.replace(/-/g, " ").toUpperCase()} Export`,
      subtitle: `Period: ${dateInfo}`,
      isServer: false,
    });

    // Add remaining metadata
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "PPpp")}`, 14, yPosition);
    yPosition += 6;
    doc.text(`Total Records: ${data.length}`, 14, yPosition);
    yPosition += 8;

    if (data.length === 0) {
      doc.text("No data available for the selected period.", 14, yPosition);
    } else {
      // Extract headers and rows
      const headers = Object.keys(data[0]);
      const rows = data.map((item) =>
        headers.map((h) => {
          const value = item[h];
          if (value === null || value === undefined) return "";
          if (typeof value === "boolean") return value ? "Yes" : "No";
          return String(value);
        }),
      );

      autoTable(doc, {
        head: [headers.map((h) => h.replace(/([A-Z])/g, " $1").trim())],
        body: rows,
        startY: yPosition,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: yPosition },
      });
    }

    doc.save(`${dataset}_export_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Date Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Date Filter</CardTitle>
          <CardDescription>
            Select a date range for time-based exports. This filter applies to
            datasets that support date filtering.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preset Period</Label>
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {presetPeriods.map((preset) => (
                    <SelectItem
                      key={preset.label}
                      value={preset.label.toLowerCase().replace(/\s+/g, "-")}
                    >
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Custom Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "PP") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => {
                        setDateRange((prev) => ({ ...prev, from: date }));
                        setSelectedPreset("");
                      }}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "PP") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => {
                        setDateRange((prev) => ({ ...prev, to: date }));
                        setSelectedPreset("");
                      }}
                    />
                  </PopoverContent>
                </Popover>

                {(dateRange.from || dateRange.to) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDateRange({ from: undefined, to: undefined });
                      setSelectedPreset("all-time");
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          {dateRange.from && dateRange.to && (
            <p className="text-sm text-muted-foreground">
              Exporting data from {format(dateRange.from, "PPP")} to{" "}
              {format(dateRange.to, "PPP")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Export Categories */}
      <Tabs defaultValue="hr" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          {exportCategories.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="gap-2"
            >
              {category.icon}
              {category.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {exportCategories.map((category) => (
          <TabsContent
            key={category.id}
            value={category.id}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {category.icon}
                  {category.title}
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.label}</span>
                          {item.supportsDateFilter && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                              Date Filter
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExport(item.id, "csv")}
                          disabled={loading !== null}
                        >
                          {loading === `${item.id}-csv` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <FileSpreadsheet className="h-4 w-4 mr-1" />
                              CSV
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExport(item.id, "pdf")}
                          disabled={loading !== null}
                        >
                          {loading === `${item.id}-pdf` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-1" />
                              PDF
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
