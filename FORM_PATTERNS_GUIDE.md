# Form Implementation Patterns - HJRBDA

## Overview

This guide documents the form patterns, server actions, and data table implementations used in the HJRBDA codebase. Use these patterns as reference for implementing your salary structure feature.

---

## 1. PROJECT STRUCTURE

### Actions Organization

```
src/actions/
├── auth/
├── documents/
├── documents/folders.ts
├── documents/documents.ts
├── hr/
│   └── employees.ts
├── tasks/
├── mail/
├── notification/
├── payments/
├── projects.ts
└── notifications/
```

**Key Point**: Actions are organized by feature/domain. Create `src/actions/payroll/` for your salary structure server actions.

### Component Organization

```
src/components/
├── payroll/
│   ├── structure-page.tsx (main page component)
│   ├── salary-structure.tsx (table component)
│   ├── allowances.tsx
│   └── deductions.tsx
├── documents/
│   ├── documents-table.tsx (data table)
│   ├── folders-table.tsx (data table)
│   ├── folders-actions.tsx (action buttons)
│   └── ...
├── tasks/
│   └── task-form-dialog.tsx
├── finance/
│   └── expense-form-dialog.tsx
└── projects/
    └── project-form-dialog.tsx
```

---

## 2. SERVER ACTIONS PATTERN

### Return Type Structure

All server actions follow this consistent pattern:

```typescript
// Return type pattern
{
  success: { reason: string; /* additional data */ } | null,
  error: { reason: string } | null
}
```

### Example: Server Action with Error Handling

From `src/actions/documents/folders.ts`:

```typescript
"use server";

import { db } from "@/db";
import { DrizzleQueryError, eq } from "drizzle-orm";
import { getUser } from "../auth/dal";
import { revalidatePath } from "next/cache";

interface CreateFoldersProps {
  name: string;
  parentId?: number | null;
  public: boolean;
  departmental: boolean;
}

export async function createFolder(data: CreateFoldersProps, pathname: string) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  if (data.name.trim().toLowerCase() === "public") {
    return {
      error: { reason: "Couldn't create folder. Public folder already exists" },
      success: null,
    };
  }

  try {
    return await db.transaction(async (tx) => {
      // Business logic here
      
      revalidatePath(pathname);
      return {
        success: { reason: "Folder created successfully" },
        error: null,
      };
    });
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }

    return {
      error: { reason: "Couldn't create folder. Check inputs and try again!" },
      success: null,
    };
  }
}
```

### Key Patterns

1. Always verify user is authenticated: `const user = await getUser();`
2. Use transactions for complex operations: `db.transaction(async (tx) => { ... })`
3. Handle both custom errors and DrizzleQueryError
4. Use revalidatePath() to refresh UI after mutations
5. Always return consistent { success, error } structure
6. Include user context for audit trails when needed

---

## 3. FORM DIALOG PATTERNS

### Pattern A: Simple Dialog Form (Expenses & Projects)

From `src/components/finance/expense-form-dialog.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Props = {
  trigger: React.ReactNode;
  initial?: {
    id: number;
    title: string;
    description: string | null;
  } | null;
  onCompleted?: () => void;
};

export function ExpenseFormDialog({ trigger, initial, onCompleted }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
  }, [initial, open]);

  async function onSubmit() {
    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
      };

      if (initial?.id) {
        // Edit
        await fetch(`/api/finance/expenses/${initial.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create
        await fetch(`/api/finance/expenses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      
      setOpen(false);
      onCompleted?.();
    } catch (error) {
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial?.id ? "Edit Item" : "New Item"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Key Features:**

- Props include `trigger` (button/icon that opens dialog), `initial` (for edit mode), `onCompleted` callback
- Uses Dialog component from shadcn/ui
- State resets when dialog opens via useEffect
- Same onSubmit handles both create and edit (check for initial?.id)
- Manual validation with alerts (or use Zod/React Hook Form for complex forms)

### Pattern B: Form Dialog with React Hook Form

From `src/components/auth/login-form.tsx`:

```typescript
"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type FormData = z.infer<typeof schema>;

const LoginForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const [formState, setFormState] = useState<{
    success?: string;
    error?: string;
  }>({});

  const onSubmit = async (data: FormData) => {
    setFormState({});
    const result = await loginUser(data); // Server action
    if (result.success) {
      setFormState({ success: result.success.reason });
      router.push("/");
    } else if (result.error) {
      setFormState({ error: result.error.reason });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-5">
      <FormSuccess message={formState.success || ""} />
      <FormError message={formState.error || ""} />
      
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...register("email")}
        />
        {errors.email && (
          <span className="text-xs text-red-500">{errors.email.message}</span>
        )}
      </div>
      
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Logging in..." : "Log In"}
      </Button>
    </form>
  );
};
```

**Key Features:**

- Uses Zod for validation schema
- Uses React Hook Form for form state management
- Server action called directly (no API route)
- Displays FormSuccess/FormError components
- Better for complex validation

### Pattern C: Complex Form with Multiple Sections

From `src/components/tasks/task-form-dialog.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { z } from "zod";

const TaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  dueDate: z.preprocess((v) => (v instanceof Date ? v : undefined), z.date()),
  assignees: z.array(z.number()).min(1, "Select at least one employee"),
});

type TaskInput = z.infer<typeof TaskSchema>;
type FormErrors = Partial<Record<keyof TaskInput, string>>;

export function TaskFormDialog({ user, onCompleted, trigger }) {
  const [info, setInfo] = useState({
    title: "",
    description: "",
    priority: "Medium",
    dueDate: undefined,
    assignees: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [subordinates, setSubordinates] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSubordinates = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/hr/employees/subordinates?employeeId=${user.id}`
      );
      const data = await response.json();
      setSubordinates(data.subordinates || []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSubordinates();
  }, [fetchSubordinates]);

  const addAssignee = (id: number) => {
    setInfo((prev) => ({
      ...prev,
      assignees: [...prev.assignees, id],
    }));
    setErrors((e) => ({ ...e, assignees: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const result = TaskSchema.safeParse(info);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof TaskInput;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    // API call
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.data),
    });
    
    if (response.ok) {
      onCompleted?.();
    }
  };

  return (
    // Form JSX
  );
}
```

**Key Features:**

- Uses Zod for validation
- Separate component state management (not React Hook Form)
- Field-level error display
- Dynamic data fetching on mount
- Callback pattern for handling/displaying errors

---

## 4. DATA TABLE PATTERNS

### Pattern: Tables with Actions (Dropdown Menus)

From `src/components/documents/folders-table.tsx`:

```typescript
"use client";

import { MoreVertical, Trash2, Archive } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function FoldersTable({ folders }) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {folders.map((folder) => (
            <TableRow key={folder.id} className="hover:bg-muted/50">
              <TableCell>
                <Folder size={24} className="text-slate-600" />
              </TableCell>
              <TableCell className="font-medium">{folder.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {folder.updatedAt.toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="px-2">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <FolderAction type="archive" id={folder.id} />
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <FolderAction type="delete" id={folder.id} />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Separate component for actions with AlertDialog confirmation
function FolderAction({ id, type }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {type === "delete" ? (
          <Button className="flex w-full gap-3" variant="secondary">
            <Trash2 className="mr-2" size={16} />
            Delete
          </Button>
        ) : (
          <Button variant="outline" className="flex w-full gap-3">
            <Archive className="mr-2" size={16} />
            Archive
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              const res = type === "delete" 
                ? await deleteFolder(id, pathname)
                : await archiveFolder(id, pathname);
              
              if (res.error) {
                toast.error(res.error.reason);
              } else {
                toast.success(res.success.reason);
              }
            }}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Key Patterns:**

- Use `<MoreVertical />` icon in button for ellipsis menu
- `DropdownMenu` for action buttons
- `AlertDialog` for confirmation dialogs
- Separate action component that handles state/logic
- Call server actions directly from onClick handlers
- Show toast notifications for success/error
- "text-right" on actions header, "text-right" on actions cell

### Pattern: Table with Pagination

From `src/components/documents/documents-table.tsx`:

```typescript
export default function DocumentsTable({ documents, paging }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = paging?.page ?? Number(searchParams?.get("page") ?? 1);
  const pageSize = paging?.pageSize ?? Number(searchParams?.get("pageSize") ?? 20);
  const total = paging?.total;
  const totalPages = paging?.totalPages ?? 
    (total ? Math.max(1, Math.ceil(total / pageSize)) : undefined);
  const hasMore = paging?.hasMore ?? (totalPages ? page < totalPages : false);

  function goToPage(p: number) {
    if (p < 1) return;
    if (totalPages && p > totalPages) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(p));
    params.set("pageSize", String(pageSize));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          {/* Table content */}
        </Table>
      </div>

      {paging && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {total && `Showing ${(page-1)*pageSize + 1}-${Math.min(page*pageSize, total)} of ${total}`}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={!hasMore}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 5. TOAST NOTIFICATIONS

From imports and usage throughout the codebase:

```typescript
import { toast } from "sonner";

// Usage in server action callbacks
if (res.error) {
  toast.error(res.error.reason);
} else {
  toast.success(res.success.reason);
}

// Or with custom messages
toast.error("Failed to save");
toast.success("Saved successfully");
toast.loading("Processing...");
```

---

## 6. DIALOG/SHEET COMPONENTS

### Dialog vs Sheet

- **Dialog**: Centered overlay, good for forms and confirmations
- **Sheet**: Side panel, good for detailed views and complex operations

From documents module:

```typescript
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Sheet example (details view)
<Sheet>
  <SheetTrigger asChild>
    <Button size="sm" variant="ghost">
      <Eye size={16} />
      Open
    </Button>
  </SheetTrigger>
  <SheetContent className="min-w-3xl">
    <SheetHeader>
      <SheetTitle>Document Details</SheetTitle>
      <SheetDescription>View and manage document</SheetDescription>
    </SheetHeader>
    {/* Content */}
  </SheetContent>
</Sheet>

// Dialog example (form/confirmation)
<Dialog>
  <DialogTrigger asChild>
    <Button>New Item</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create New Item</DialogTitle>
    </DialogHeader>
    {/* Form content */}
  </DialogContent>
</Dialog>
```

---

## 7. RECOMMENDED APPROACH FOR SALARY STRUCTURE

Based on the patterns observed, here's the recommended structure for your salary structure feature:

### 1. Create Server Actions

File: `src/actions/payroll/salary-structure.ts`

```typescript
"use server";

import { db } from "@/db";
import { salaryStructure, allowances, deductions } from "@/db/schema";
import { DrizzleQueryError, eq } from "drizzle-orm";
import { getUser } from "../auth/dal";
import { revalidatePath } from "next/cache";

export async function createSalaryStructure(
  data: {
    name: string;
    baseSalary: string;
    description: string;
    allowances?: number[];
    deductions?: number[];
  },
  pathname: string
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(salaryStructure)
        .values({
          name: data.name.trim(),
          baseSalary: data.baseSalary,
          description: data.description,
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning();

      revalidatePath(pathname);
      return {
        success: { reason: "Salary structure created successfully", id: created.id },
        error: null,
      };
    });
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error" },
      };
    }
    return {
      error: { reason: "Couldn't create salary structure. Try again!" },
      success: null,
    };
  }
}

export async function updateSalaryStructure(
  id: number,
  data: {
    name: string;
    baseSalary: string;
    description: string;
  },
  pathname: string
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    await db
      .update(salaryStructure)
      .set({
        name: data.name.trim(),
        baseSalary: data.baseSalary,
        description: data.description,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(salaryStructure.id, id));

    revalidatePath(pathname);
    return {
      success: { reason: "Salary structure updated successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error" },
      };
    }
    return {
      error: { reason: "Couldn't update salary structure. Try again!" },
      success: null,
    };
  }
}

export async function deleteSalaryStructure(id: number, pathname: string) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    await db.delete(salaryStructure).where(eq(salaryStructure.id, id));

    revalidatePath(pathname);
    return {
      success: { reason: "Salary structure deleted successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error" },
      };
    }
    return {
      error: { reason: "Couldn't delete salary structure. Try again!" },
      success: null,
    };
  }
}

export async function getAllSalaryStructures() {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    const structures = await db.select().from(salaryStructure).orderBy(salaryStructure.createdAt);
    return {
      success: structures,
      error: null,
    };
  } catch (err) {
    return {
      success: null,
      error: { reason: "Couldn't fetch salary structures" },
    };
  }
}
```

### 2. Create Form Dialog Component

File: `src/components/payroll/salary-structure-form-dialog.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import {
  createSalaryStructure,
  updateSalaryStructure,
} from "@/actions/payroll/salary-structure";

type Props = {
  trigger: React.ReactNode;
  initial?: {
    id: number;
    name: string;
    baseSalary: string;
    description: string;
  } | null;
  onCompleted?: () => void;
};

export function SalaryStructureFormDialog({
  trigger,
  initial,
  onCompleted,
}: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [baseSalary, setBaseSalary] = useState(initial?.baseSalary ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setBaseSalary(initial?.baseSalary ?? "");
    setDescription(initial?.description ?? "");
  }, [initial, open]);

  async function onSubmit() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!baseSalary || Number(baseSalary) <= 0) {
      toast.error("Base salary must be greater than 0");
      return;
    }

    setSaving(true);
    try {
      const res = initial?.id
        ? await updateSalaryStructure(
            initial.id,
            { name: name.trim(), baseSalary, description },
            pathname
          )
        : await createSalaryStructure(
            { name: name.trim(), baseSalary, description },
            pathname
          );

      if (res.success) {
        toast.success(res.success.reason);
        setOpen(false);
        onCompleted?.();
      } else {
        toast.error(res.error?.reason ?? "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial?.id ? "Edit Salary Structure" : "New Salary Structure"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Structure Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard Salary Package"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="baseSalary">Base Salary *</Label>
            <Input
              id="baseSalary"
              type="number"
              step="0.01"
              min="0"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Create Data Table Component

File: `src/components/payroll/salary-structures-table.tsx`

```typescript
"use client";

import { useState } from "react";
import { MoreVertical, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { deleteSalaryStructure } from "@/actions/payroll/salary-structure";
import { SalaryStructureFormDialog } from "./salary-structure-form-dialog";

type SalaryStructure = {
  id: number;
  name: string;
  baseSalary: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

type Props = {
  structures: SalaryStructure[];
  onStructureUpdated?: () => void;
};

export function SalaryStructuresTable({
  structures,
  onStructureUpdated,
}: Props) {
  const pathname = usePathname();
  const [selectedStructure, setSelectedStructure] =
    useState<SalaryStructure | null>(null);

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Base Salary</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {structures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No salary structures found
                </TableCell>
              </TableRow>
            ) : (
              structures.map((structure) => (
                <TableRow key={structure.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{structure.name}</TableCell>
                  <TableCell>{structure.baseSalary}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {structure.description}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {structure.updatedAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <SalaryStructureFormDialog
                        trigger={
                          <Button size="sm" variant="ghost">
                            <Edit size={16} />
                          </Button>
                        }
                        initial={structure}
                        onCompleted={onStructureUpdated}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="px-2">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <DeleteStructureAction
                              id={structure.id}
                              name={structure.name}
                              pathname={pathname}
                              onCompleted={onStructureUpdated}
                            />
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DeleteStructureAction({
  id,
  name,
  pathname,
  onCompleted,
}: {
  id: number;
  name: string;
  pathname: string;
  onCompleted?: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="flex w-full gap-3" variant="secondary">
          <Trash2 className="mr-2" size={16} />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Salary Structure?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              const res = await deleteSalaryStructure(id, pathname);
              if (res.success) {
                toast.success(res.success.reason);
                onCompleted?.();
              } else {
                toast.error(res.error?.reason ?? "Failed to delete");
              }
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 4. Create Main Page Component

File: `src/components/payroll/structure-page.tsx` (update existing)

```typescript
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SalaryStructureFormDialog } from "./salary-structure-form-dialog";
import { SalaryStructuresTable } from "./salary-structures-table";
import { getAllSalaryStructures } from "@/actions/payroll/salary-structure";
import { Spinner } from "@/components/ui/spinner";

export default function StructurePage() {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadStructures() {
    setLoading(true);
    try {
      const result = await getAllSalaryStructures();
      if (result.success) {
        setStructures(result.success);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStructures();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Salary Structures</h1>
          <p className="text-muted-foreground mt-1">
            Manage salary structures and components
          </p>
        </div>
        <SalaryStructureFormDialog
          trigger={
            <Button>
              <Plus className="mr-2" size={16} />
              New Structure
            </Button>
          }
          onCompleted={loadStructures}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <SalaryStructuresTable
          structures={structures}
          onStructureUpdated={loadStructures}
        />
      )}
    </div>
  );
}
```

---

## 8. RECOMMENDED UI COMPONENTS

The project uses shadcn/ui components. Common ones needed for forms:

- `Button` - Actions
- `Dialog` / `Sheet` - Modals
- `Input` - Text fields
- `Label` - Form labels
- `Textarea` - Multi-line text
- `Select` - Dropdown selection
- `Table` - Data display
- `Badge` - Tags/status
- `DropdownMenu` - Menu actions
- `AlertDialog` - Confirmations
- `Tabs` - Section navigation
- `Card` - Content containers
- `Spinner` - Loading state
- `Toast` (from sonner) - Notifications

---

## 9. KEY TAKEAWAYS

1. **Always use server actions** for mutations, not API routes
2. **Return consistent structure**: `{ success: {...} | null, error: {...} | null }`
3. **Handle errors properly**: DrizzleQueryError + generic fallback
4. **Use revalidatePath()** to refresh data after mutations
5. **Toast notifications** from 'sonner' for user feedback
6. **Dialog components** from shadcn/ui for forms
7. **AlertDialog** for destructive confirmations
8. **DropdownMenu** with MoreVertical icon for table actions
9. **Separate components** for complex operations (forms, actions)
10. **Verify user authentication** in every server action
