"use client";

import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllContractors } from "@/actions/contractors";
import { getAllEmployees } from "@/actions/hr/employees";
import { createProject, updateProject } from "@/actions/projects";
import { getUser } from "@/actions/auth/dal";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { formatCoordinate } from "@/lib/geo-utils";

const LocationPickerMap = dynamic(
  () => import("./location-picker-map").then((m) => m.LocationPickerMap),
  { ssr: false },
);

type Supervisor = { id: number; name: string; email: string };
type Contractor = { id: number; name: string };
type Employee = {
  id: number;
  name: string;
  email: string;
  isManager?: boolean | number;
  role?: string;
};

type Props = {
  trigger: React.ReactNode;
  initial?: {
    id: number;
    name: string;
    code: string;
    description: string | null;
    street: string;
    city: string;
    state: string;
    latitude?: string | null;
    longitude?: string | null;
    supervisorId: number | null;
    contractorId?: number | null;
    members?: { employeeId: number }[];
    status?: string;
    budgetPlanned?: number | null;
    budgetActual?: number | null;
  } | null;
  onCompleted?: () => void;
};

export function ProjectFormDialog({ trigger, initial, onCompleted }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [street, setStreet] = useState(initial?.street ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [latitude, setLatitude] = useState<string | null>(
    initial?.latitude ?? null,
  );
  const [longitude, setLongitude] = useState<string | null>(
    initial?.longitude ?? null,
  );
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [budgetPlanned, setBudgetPlanned] = useState<string>("0");
  const [budgetActual, setBudgetActual] = useState<string>("0");
  const [supervisorId, setSupervisorId] = useState<string>(
    initial?.supervisorId ? String(initial.supervisorId) : "",
  );
  const [contractorId, setContractorId] = useState<string>(
    initial?.contractorId ? String(initial.contractorId) : "",
  );
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    initial?.members?.map((m) => String(m.employeeId)) ?? [],
  );

  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [status, setStatus] = useState<string>(
    initial ? (initial.status ?? "pending") : "pending",
  );

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [empData, contData, userData] = await Promise.all([
        getAllEmployees(),
        getAllContractors(),
        getUser(),
      ]);
      const currentUserId = userData?.id;
      const filteredEmployees = (empData as Employee[]).filter(
        (e) => e.id !== currentUserId,
      );
      setEmployees(filteredEmployees);
      setSupervisors(
        (empData as Employee[]).filter(
          (e) => e.isManager || e.role?.toLowerCase() === "admin",
        ),
      );
      setContractors(contData);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setStreet(initial?.street ?? "");
    setCity(initial?.city ?? "");
    setState(initial?.state ?? "");
    setLatitude(initial?.latitude ?? null);
    setLongitude(initial?.longitude ?? null);
    setShowMapPicker(false);
    setSupervisorId(initial?.supervisorId ? String(initial.supervisorId) : "");
    setContractorId(initial?.contractorId ? String(initial.contractorId) : "");
    setSelectedMembers(
      initial?.members?.map((m) => String(m.employeeId)) ?? [],
    );
    setBudgetPlanned(
      initial?.budgetPlanned ? String(initial.budgetPlanned) : "0",
    );
    setBudgetActual(initial?.budgetActual ? String(initial.budgetActual) : "0");
    setStatus(initial?.status ?? "pending");
  }, [initial, open]);

  async function onSubmit() {
    if (!name || !status || !street || !city || !state) return;

    startTransition(async () => {
      const payload = {
        name,
        description: description || null,
        street,
        city,
        state,
        latitude: latitude || null,
        longitude: longitude || null,
        supervisorId: supervisorId ? Number(supervisorId) : null,
        contractorId: contractorId ? Number(contractorId) : null,
        memberIds: selectedMembers.map(Number),
        budgetPlanned: Number(budgetPlanned) || 0,
        budgetActual: Number(budgetActual) || 0,
        status: status as "pending" | "in-progress" | "completed",
      };

      const result = initial?.id
        ? await updateProject(initial.id, payload)
        : await createProject(payload);

      if (result.error) {
        toast.error(result.error.reason);
      } else {
        toast.success(initial?.id ? "Project updated" : "Project created");
        setOpen(false);
        onCompleted?.();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("projects:changed"));
        }
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial?.id ? "Edit Project" : "New Project"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="street">Street *</Label>
              <Input
                id="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>GPS Coordinates</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMapPicker(!showMapPicker)}
              >
                {showMapPicker ? "Hide Map" : "Pick on Map"}
              </Button>
            </div>
            {showMapPicker && (
              <div className="h-[300px] rounded-lg overflow-hidden border">
                <LocationPickerMap
                  initialLat={latitude ? Number(latitude) : undefined}
                  initialLng={longitude ? Number(longitude) : undefined}
                  onLocationSelect={(lat, lng, address) => {
                    setLatitude(String(lat));
                    setLongitude(String(lng));
                    if (address) {
                      if (address.street) setStreet(address.street);
                      if (address.city) setCity(address.city);
                      if (address.state) setState(address.state);
                    }
                  }}
                />
              </div>
            )}
            {latitude && longitude && (
              <p className="text-xs text-muted-foreground">
                Selected: {formatCoordinate(latitude)},{" "}
                {formatCoordinate(longitude)}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 mt-2 sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Status *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Supervisor</Label>
              <Select
                value={supervisorId}
                onValueChange={(v) => setSupervisorId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Contractor</Label>
              <Select
                value={contractorId}
                onValueChange={(v) => setContractorId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a contractor" />
                </SelectTrigger>
                <SelectContent>
                  {contractors.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Project Members</Label>
            <MultiSelect
              options={employees.map((e) => ({
                label: e.name,
                value: String(e.id),
              }))}
              selected={selectedMembers}
              onChange={setSelectedMembers}
              placeholder="Select project members..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="budgetPlanned">Budget (planned)</Label>
              <Input
                id="budgetPlanned"
                type="number"
                value={budgetPlanned}
                onChange={(e) => setBudgetPlanned(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="budgetActual">Budget (actual)</Label>
              <Input
                id="budgetActual"
                type="number"
                value={budgetActual}
                onChange={(e) => setBudgetActual(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending
              ? "Saving..."
              : initial?.id
                ? "Save changes"
                : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
