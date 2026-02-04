/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createUser } from "@/actions/auth/auth";
import { toast } from "sonner";
import { getManagers } from "@/actions/auth/users";
import { Switch } from "@/components/ui/switch";

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.email("Invalid email format."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(["user", "admin"]),
  autoVerify: z.boolean(),
  isManager: z.boolean(),
  phone: z.string().optional(),
  staffNumber: z.string().optional(),
  department: z.string().min(2, "Department is required"),
  managerId: z.string().optional(),
  dateOfBirth: z.date().nullable(),
  address: z.string().optional(),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Intern"]),
});

interface UserAddDialogProps {
  isOpen: boolean;
  onCloseAction: () => void;
  onSuccess?: () => void;
}

export function UserAddDialog({
  isOpen,
  onCloseAction,
  onSuccess,
}: UserAddDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "user" | "admin",
    autoVerify: true,
    isManager: false,
  });

  const [employeeData, setEmployeeData] = useState({
    phone: "",
    staffNumber: "",
    department: "",
    managerId: "" as string,
    dateOfBirth: null as Date | null,
    address: "",
    maritalStatus: "Single" as "Single" | "Married" | "Divorced" | "Widowed",
    employmentType: "Full-time" as
      | "Full-time"
      | "Part-time"
      | "Contract"
      | "Intern",
  });
  const [managers, setManagers] = useState<{ id: number; name: string }[]>([]);

  // Fetch managers
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await getManagers();
        if (res.success) setManagers(res.data ?? []);
        else toast.error(res.error.reason);
      } catch {
        toast.error("Unexpected error. Please try again");
      }
    })();
  }, [isOpen]);

  const validateField = (field: string, value: any) => {
    const merged = { ...formData, ...employeeData, [field]: value };
    const result = userSchema.safeParse(merged);

    if (!result.success) {
      const fieldError = result.error.issues.find(
        (issue) => issue.path[0] === field,
      );
      setErrors((prev) => ({
        ...prev,
        [field]: fieldError ? fieldError.message : "",
      }));
    } else {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validateForm = () => {
    const parsed = userSchema.safeParse({ ...formData, ...employeeData });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return toast.error("Invalid form submission");
    setIsLoading(true);

    const res = await createUser({
      ...formData,
      data: {
        phone: employeeData.phone || undefined,
        staffNumber: employeeData.staffNumber || undefined,
        department: employeeData.department || undefined,
        managerId: employeeData.managerId || undefined,
        dateOfBirth: employeeData.dateOfBirth || undefined,
        address: employeeData.address || undefined,
        maritalStatus: employeeData.maritalStatus || undefined,
        employmentType: employeeData.employmentType || undefined,
      },
    });

    if (res.error) {
      toast.error(res.error.reason);
    } else {
      toast.success(
        formData.autoVerify
          ? "User created and verified successfully"
          : "User created successfully. Verification email sent.",
      );
      onSuccess?.();
      onCloseAction();

      setFormData({
        name: "",
        email: "",
        password: "",
        role: "user",
        autoVerify: true,
        isManager: false,
      });
      setEmployeeData({
        phone: "",
        staffNumber: "",
        department: "",
        managerId: "",
        dateOfBirth: null,
        address: "",
        maritalStatus: "Single",
        employmentType: "Full-time",
      });
    }
    setIsLoading(false);
  };

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      onConfirmAction={handleCreateUser}
      title="Add New User"
      description="Create a new user account with the following details."
      confirmText={isLoading ? "Creating..." : "Create User"}
    >
      <div className="grid gap-4 grid-cols-2 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            name="name"
            value={formData.name}
            onChange={(e) => {
              setFormData((p) => ({ ...p, name: e.target.value }));
              validateField("name", e.target.value);
            }}
            placeholder="Enter user's name"
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            name="email"
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData((p) => ({ ...p, email: e.target.value }));
              validateField("email", e.target.value);
            }}
            placeholder="Enter user's email"
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password *</Label>
          <Input
            name="password"
            type="password"
            value={formData.password}
            onChange={(e) => {
              setFormData((p) => ({ ...p, password: e.target.value }));
              validateField("password", e.target.value);
            }}
            placeholder="Enter user's password"
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="role">Role *</Label>
          <Select
            value={formData.role}
            onValueChange={(value: "admin" | "user") => {
              setFormData((p) => ({ ...p, role: value }));
              validateField("role", value);
            }}
          >
            <SelectTrigger name="role" className="w-full">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="isManager" className="cursor-pointer">
            Is user a manager?
          </Label>
          <Switch
            name="isManager"
            checked={formData.isManager}
            onCheckedChange={(checked) => {
              setFormData((p) => ({ ...p, isManager: checked }));
              validateField("isManager", checked);
            }}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="department">Department *</Label>
          <Select
            value={employeeData.department}
            onValueChange={(value: string) => {
              setEmployeeData((prev) => ({ ...prev, department: value }));
              validateField("department", value);
            }}
          >
            <SelectTrigger id="department" className="w-full">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
            </SelectContent>
          </Select>
          {errors.department && (
            <p className="text-sm text-red-500">{errors.department}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="managerId">Manager</Label>
          <Select
            value={employeeData.managerId}
            onValueChange={(value: string) =>
              setEmployeeData((prev) => ({ ...prev, managerId: value }))
            }
          >
            <SelectTrigger name="managerId" className="w-full">
              <SelectValue placeholder="Select employee's manager" />
            </SelectTrigger>
            <SelectContent>
              {managers.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            name="phone"
            value={employeeData.phone}
            onChange={(e) => {
              setEmployeeData((p) => ({ ...p, phone: e.target.value }));
              validateField("phone", e.target.value);
            }}
            placeholder="Enter phone number"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !employeeData.dateOfBirth && "text-muted-foreground",
                )}
              >
                {employeeData.dateOfBirth ? (
                  new Date(employeeData.dateOfBirth).toLocaleDateString()
                ) : (
                  <span>Pick a date</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={employeeData.dateOfBirth ?? undefined}
                onSelect={(d) =>
                  setEmployeeData((p) => ({ ...p, dateOfBirth: d ?? null }))
                }
                disabled={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
                captionLayout="dropdown"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="maritalStatus">Marital Status</Label>
          <Select
            value={employeeData.maritalStatus}
            onValueChange={(
              value: "Married" | "Single" | "Divorced" | "Widowed",
            ) => setEmployeeData((prev) => ({ ...prev, maritalStatus: value }))}
          >
            <SelectTrigger name="maritalStatus" className="w-full">
              <SelectValue placeholder="Select marital status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Married">Married</SelectItem>
              <SelectItem value="Single">Single</SelectItem>
              <SelectItem value="Divorced">Divorced</SelectItem>
              <SelectItem value="Widowed">Widowed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="employmentType">Employment Type</Label>
          <Select
            value={employeeData.employmentType}
            onValueChange={(
              value: "Full-time" | "Part-time" | "Contract" | "Intern",
            ) =>
              setEmployeeData((prev) => ({ ...prev, employmentType: value }))
            }
          >
            <SelectTrigger name="employmentType" className="w-full">
              <SelectValue placeholder="Select employment type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Full-time">Full-Time</SelectItem>
              <SelectItem value="Part-time">Part-Time</SelectItem>
              <SelectItem value="Contract">Contract</SelectItem>
              <SelectItem value="Intern">Intern</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2 col-span-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            name="address"
            rows={3}
            value={employeeData.address}
            onChange={(e) => {
              setEmployeeData((p) => ({ ...p, address: e.target.value }));
              validateField("address", e.target.value);
            }}
            placeholder="Enter full address"
          />
        </div>
      </div>
    </ConfirmationDialog>
  );
}
