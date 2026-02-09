"use client";

import { useEffect, useMemo, useState, use } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import {
  Camera,
  Calendar,
  ChevronLeft,
  Loader2,
  Receipt,
  FileText,
  Download,
} from "lucide-react";
import { ProjectHeader } from "@/components/projects/project-header";
import { toast } from "sonner";
import { ProjectsPageSkeleton } from "@/components/skeletons";
import {
  useProject,
  useProjectExpenses,
  useProjectPhotos,
} from "@/hooks/projects";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PhotoCaptureDialog } from "@/components/projects/photo-capture-dialog";
import { ProjectPhotosGallery } from "@/components/projects/project-photos-gallery";
import { OfflineSyncIndicator } from "@/components/projects/offline-sync-indicator";

type Milestone = {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  dueDate: Date | string | null;
  completed: number;
};

type Expense = {
  id: number;
  projectId: number;
  title: string;
  amount: number;
  spentAt: Date | string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = Number(id);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [open, setOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("milestones");

  // Fetch current user using React Query (GET instead of POST)
  const { data: currentUser } = useCurrentUser();

  // Fetch project using React Query
  const {
    data: project,
    isLoading,
    refetch: refetchProject,
  } = useProject(projectId);

  // Fetch expenses only when expenses tab is active
  const { data: expenses = [], refetch: refetchExpenses } = useProjectExpenses(
    projectId,
    activeTab === "expenses",
  );

  // Photos state
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);
  const [photoCategoryFilter, setPhotoCategoryFilter] = useState("all");
  const [photoMilestoneFilter, setPhotoMilestoneFilter] = useState("all");

  // Fetch photos only when photos tab is active
  const {
    data: photosData,
    isLoading: photosLoading,
    refetch: refetchPhotos,
  } = useProjectPhotos(projectId, activeTab === "photos", {
    category: photoCategoryFilter !== "all" ? photoCategoryFilter : undefined,
    milestoneId:
      photoMilestoneFilter !== "all" ? Number(photoMilestoneFilter) : undefined,
  });

  // Handle unauthorized access
  useEffect(() => {
    if (!isLoading && !project) {
      router.push("/unauthorized");
    }
  }, [project, isLoading, router]);

  const milestones = project?.milestones ?? [];

  const progress = useMemo(() => {
    if (!milestones.length) return 0;
    const completed = milestones.filter((m) => m.completed).length;
    return Math.round((completed / milestones.length) * 100);
  }, [milestones]);

  const spent = useMemo(
    () => expenses.reduce((acc, it) => acc + (it.amount ?? 0), 0),
    [expenses],
  );
  const remaining = useMemo(
    () => (project?.budgetPlanned ?? 0) - spent,
    [project, spent],
  );

  const isAdmin =
    currentUser?.role?.toLowerCase() === "admin" ||
    currentUser?.department?.toLowerCase() === "admin";
  const isCreator = project?.creatorId === currentUser?.id;
  const _isSupervisor = project?.supervisorId === currentUser?.id;
  const isEditable = isAdmin || isCreator;

  async function saveMilestone() {
    if (!title || !dueDate) return;
    try {
      const response = editingMilestone?.id
        ? await fetch(`/api/projects/${projectId}/milestones`, {
            method: "PUT",
            body: JSON.stringify({
              id: editingMilestone.id,
              title,
              description,
              dueDate,
            }),
          })
        : await fetch(`/api/projects/${projectId}/milestones`, {
            method: "POST",
            body: JSON.stringify({ title, description, dueDate }),
          });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save milestone");
      }

      setTitle("");
      setDescription("");
      setDueDate("");
      setEditingMilestone(null);
      setOpen(false);
      refetchProject();
      toast.success(
        editingMilestone ? "Milestone updated" : "Milestone created",
      );
    } catch (error) {
      console.error("Error saving milestone:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save milestone",
      );
    }
  }

  function openNewMilestone() {
    setEditingMilestone(null);
    setTitle("");
    setDescription("");
    setDueDate("");
    setOpen(true);
  }

  function openEditMilestone(m: Milestone) {
    setEditingMilestone(m);
    setTitle(m.title);
    setDescription(m.description ?? "");
    setDueDate(m.dueDate ? new Date(m.dueDate).toISOString().slice(0, 10) : "");
    setOpen(true);
  }

  async function deleteMilestone(m: Milestone) {
    if (!confirm("Are you sure you want to delete this milestone?")) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "DELETE",
        body: JSON.stringify({ id: m.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete milestone");
      }

      refetchProject();
      toast.success("Milestone deleted");
    } catch (error) {
      console.error("Error deleting milestone:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete milestone",
      );
    }
  }

  async function toggleMilestone(m: Milestone) {
    try {
      const response = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "PUT",
        body: JSON.stringify({ id: m.id, completed: m.completed ? 0 : 1 }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update milestone");
      }

      refetchProject();
      toast.success(m.completed ? "Milestone reopened" : "Milestone completed");
    } catch (error) {
      console.error("Error toggling milestone:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update milestone",
      );
    }
  }

  // Expenses
  const [eOpen, setEOpen] = useState(false);
  const [eTitle, setETitle] = useState("");
  const [eAmount, setEAmount] = useState("");
  const [eDate, setEDate] = useState("");
  const [eNotes, setENotes] = useState("");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  function openNewExpense() {
    setEditingExpense(null);
    setETitle("");
    setEAmount("");
    setEDate("");
    setENotes("");
    setEOpen(true);
  }

  function openEditExpense(exp: Expense) {
    setEditingExpense(exp);
    setETitle(exp.title ?? "");
    setEAmount(String(exp.amount ?? ""));
    setEDate(
      exp.spentAt ? new Date(exp.spentAt).toISOString().slice(0, 10) : "",
    );
    setENotes(exp.notes ?? "");
    setEOpen(true);
  }

  async function saveExpense() {
    const payload = {
      title: eTitle,
      amount: Number(eAmount) || 0,
      spentAt: eDate || null,
      notes: eNotes || null,
    };
    try {
      const response = editingExpense?.id
        ? await fetch(`/api/projects/${projectId}/expenses`, {
            method: "PUT",
            body: JSON.stringify({ id: editingExpense.id, ...payload }),
          })
        : await fetch(`/api/projects/${projectId}/expenses`, {
            method: "POST",
            body: JSON.stringify(payload),
          });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save expense");
      }

      setEOpen(false);
      refetchExpenses();
      toast.success(editingExpense ? "Expense updated" : "Expense created");
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save expense",
      );
    }
  }

  async function deleteExpense(exp: Expense) {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/expenses`, {
        method: "DELETE",
        body: JSON.stringify({ id: exp.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete expense");
      }

      refetchExpenses();
      toast.success("Expense deleted");
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete expense",
      );
    }
  }

  // Export functionality
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(format: "csv" | "pdf") {
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/export?format=${format}`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to export project");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = format === "csv" ? "csv" : "pdf";
      a.download = `${project?.code}-${project?.name.replace(/[^a-z0-9]/gi, "-")}-export.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Project exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to export project",
      );
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading) {
    return <ProjectsPageSkeleton />;
  }

  return (
    <div className="space-y-6 p-2 max-w-7xl mx-auto animate-in fade-in duration-500">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="-ml-2 hover:bg-transparent hover:text-primary"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to Projects
      </Button>

      {project && (
        <>
          <ProjectHeader
            project={project}
            progress={progress}
            spent={spent}
            remaining={remaining}
          />

          {/* Export Buttons */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("pdf")}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export PDF
            </Button>
          </div>
        </>
      )}

      <div className="flex items-center gap-4 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("milestones")}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            activeTab === "milestones"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Milestones
          {activeTab === "milestones" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("expenses")}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            activeTab === "expenses"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Expenses
          {activeTab === "expenses" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("photos")}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            activeTab === "photos"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Photos
          {activeTab === "photos" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      <div className="min-h-[400px]">
        {activeTab === "milestones" && (
          <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Project Milestones</h2>
              <div className="flex gap-2">
                {isEditable && (
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={openNewMilestone}>
                        Add Milestone
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingMilestone
                            ? "Edit Milestone"
                            : "New Milestone"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div className="grid gap-1">
                          <Label htmlFor="ms-title">Title *</Label>
                          <Input
                            id="ms-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="ms-due">Due date *</Label>
                          <Input
                            id="ms-due"
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-1 sm:col-span-3">
                          <Label htmlFor="ms-desc">Description</Label>
                          <Textarea
                            id="ms-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={saveMilestone}>
                          {editingMilestone ? "Save" : "Add"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              {milestones.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/10 border-dashed">
                  <p className="text-muted-foreground">No milestones yet</p>
                </div>
              ) : (
                milestones.map((m) => (
                  <div
                    key={m.id}
                    className="group flex items-start justify-between gap-4 rounded-lg border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/20"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 h-2 w-2 rounded-full ${m.completed ? "bg-green-500" : "bg-gray-300"}`}
                      />
                      <div>
                        <div
                          className={`font-medium ${m.completed ? "line-through text-muted-foreground" : ""}`}
                        >
                          {m.title}
                        </div>
                        {m.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {m.description}
                          </p>
                        )}
                        {m.dueDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                            <Calendar className="h-3 w-3" />
                            Due: {new Date(m.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    {isEditable && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant={m.completed ? "secondary" : "default"}
                          size="sm"
                          onClick={() => toggleMilestone(m)}
                        >
                          {m.completed ? "Undo" : "Complete"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditMilestone(m)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMilestone(m)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "photos" && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Project Photos</h2>
                <OfflineSyncIndicator />
              </div>
              <Button size="sm" onClick={() => setPhotoCaptureOpen(true)}>
                <Camera className="h-4 w-4 mr-2" />
                Capture Photos
              </Button>
            </div>

            <ProjectPhotosGallery
              photos={photosData?.photos ?? []}
              milestones={milestones.map((m) => ({ id: m.id, title: m.title }))}
              isLoading={photosLoading}
              projectId={projectId}
              isEditable={isEditable}
              categoryFilter={photoCategoryFilter}
              onCategoryChange={setPhotoCategoryFilter}
              milestoneFilter={photoMilestoneFilter}
              onMilestoneChange={setPhotoMilestoneFilter}
              onRefetch={refetchPhotos}
              projectLocation={
                project?.latitude && project?.longitude
                  ? {
                      latitude: Number(project.latitude),
                      longitude: Number(project.longitude),
                      label: [project.street, project.city, project.state]
                        .filter(Boolean)
                        .join(", "),
                    }
                  : null
              }
            />

            <PhotoCaptureDialog
              projectId={projectId}
              milestones={milestones.map((m) => ({ id: m.id, title: m.title }))}
              open={photoCaptureOpen}
              onOpenChange={setPhotoCaptureOpen}
            />
          </div>
        )}

        {activeTab === "expenses" && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Project Expenses</h2>
              <div className="flex gap-2">
                {isEditable && (
                  <Dialog open={eOpen} onOpenChange={setEOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={openNewExpense}>
                        Add Expense
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingExpense ? "Edit Expense" : "New Expense"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div className="grid gap-1">
                          <Label htmlFor="ex-title">Title</Label>
                          <Input
                            id="ex-title"
                            value={eTitle}
                            onChange={(e) => setETitle(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="ex-amount">Amount</Label>
                          <Input
                            id="ex-amount"
                            type="number"
                            value={eAmount}
                            onChange={(e) => setEAmount(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="ex-date">Date</Label>
                          <Input
                            id="ex-date"
                            type="date"
                            value={eDate}
                            onChange={(e) => setEDate(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-1 sm:col-span-3">
                          <Label htmlFor="ex-notes">Notes</Label>
                          <Textarea
                            id="ex-notes"
                            value={eNotes}
                            onChange={(e) => setENotes(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={saveExpense}>
                          {editingExpense ? "Save" : "Add"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              {expenses.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/10 border-dashed">
                  <p className="text-muted-foreground">No expenses recorded</p>
                </div>
              ) : (
                expenses.map((ex) => (
                  <div
                    key={ex.id}
                    className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/20"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
                        <Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <div className="font-medium">{ex.title}</div>
                        <div className="text-lg font-bold text-primary">
                          ₦{(ex.amount ?? 0).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {ex.spentAt && (
                            <span>
                              {new Date(ex.spentAt).toLocaleDateString()}
                            </span>
                          )}
                          {ex.notes && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px]">
                                {ex.notes}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {isEditable && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditExpense(ex)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteExpense(ex)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
