/** biome-ignore-all lint/a11y/noStaticElementInteractions: <> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <> */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Separator } from "@/components/ui/separator";
import { ProjectFormDialog } from "./project-form-dialog";
import { listProjects, deleteProject } from "@/actions/projects";
import { getUser } from "@/actions/auth/dal";
import { toast } from "sonner";

type Project = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  location: string | null;
  status: string;
  supervisorId: number | null;
  creatorId: number;
  createdAt: Date | string;
  members?: { employeeId: number }[];
};

export function ProjectsTable() {
  const router = useRouter();
  const [items, setItems] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<Awaited<
    ReturnType<typeof getUser>
  > | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const uData = await getUser();
      setCurrentUser(uData);

      const res = await listProjects({
        page,
        limit,
        q,
        // Status filtering is handled by listProjects if we update it,
        // but for now listProjects only handles q.
        // I'll stick to q and pagination for now as listProjects is already implemented.
      });

      let filteredProjects = res.projects;
      if (status !== "all") {
        filteredProjects = filteredProjects.filter((p) => p.status === status);
      }

      setItems(filteredProjects as Project[]);
      setTotal(res.total);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, status]);

  // Reset to page 1 when filters change
  const prevFiltersRef = useRef({ q, status, dateFrom, dateTo });
  useEffect(() => {
    const prevFilters = prevFiltersRef.current;
    const filtersChanged =
      prevFilters.q !== q ||
      prevFilters.status !== status ||
      prevFilters.dateFrom !== dateFrom ||
      prevFilters.dateTo !== dateTo;

    if (filtersChanged) {
      setPage(1);
      prevFiltersRef.current = { q, status, dateFrom, dateTo };
    }
  }, [q, status, dateFrom, dateTo]);

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      const detail = { q, status, dateFrom, dateTo };
      window.dispatchEvent(new CustomEvent("projects:filters", { detail }));
    }
  }, [load, q, status, dateFrom, dateTo]);

  async function onDelete(id: number) {
    if (!confirm("Are you sure you want to delete this project?")) return;
    const res = await deleteProject(id);
    if (res.success) {
      toast.success("Project deleted");
      load();
    } else {
      toast.error(res.error?.reason || "Failed to delete project");
    }
  }

  const _clearDateFilters = () => {
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const [view, setView] = useState<"list" | "grid">("grid");

  const canCreate = !!currentUser;
  const isAdmin =
    currentUser?.role?.toLowerCase() === "admin" ||
    currentUser?.department?.toLowerCase() === "admin";

  const canEdit = (project: Project) =>
    isAdmin || project.creatorId === currentUser?.id;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search projects..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1"
          />
          <Select value={status} onValueChange={(v) => setStatus(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center border rounded-md bg-background">
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setView("list")}
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setView("grid")}
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
            </Button>
          </div>
          {canCreate && (
            <ProjectFormDialog
              onCompleted={() => load()}
              trigger={<Button className="ml-auto">New Project</Button>}
            />
          )}
        </div>
      </div>
      <Separator />

      {loading ? (
        <div className="py-20 text-center">Loading projects...</div>
      ) : view === "list" ? (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No projects found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((p) => (
                  <TableRow
                    key={p.id}
                    className="group cursor-pointer"
                    onClick={() => router.push(`/projects/${p.id}`)}
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.code}</TableCell>
                    <TableCell>{p.location || "—"}</TableCell>
                    <TableCell>
                      {(() => {
                        const status = (p.status ?? "pending") as string;
                        const base =
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
                        const color =
                          status === "completed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : status === "in-progress"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
                        return (
                          <div className={`${base} ${color}`}>{status}</div>
                        );
                      })()}
                    </TableCell>
                    <TableCell
                      className="text-right space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={`/projects/${p.id}`}
                        title="View"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="View project"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </a>
                      {canEdit(p) && (
                        <>
                          <ProjectFormDialog
                            initial={p}
                            onCompleted={() => load()}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Edit project"
                                title="Edit"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(p.id);
                            }}
                            aria-label="Delete project"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.length === 0 ? (
            <div className="col-span-full py-20 text-center text-muted-foreground border rounded-lg border-dashed">
              No projects found.
            </div>
          ) : (
            items.map((p) => (
              <div
                key={p.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/50 cursor-pointer"
                onClick={() => router.push(`/projects/${p.id}`)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold leading-none tracking-tight">
                        {p.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{p.code}</p>
                    </div>
                    {(() => {
                      const status = (p.status ?? "pending") as string;
                      const color =
                        status === "completed"
                          ? "bg-green-500"
                          : status === "in-progress"
                            ? "bg-blue-500"
                            : "bg-yellow-500";
                      return (
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${color}`}
                          title={status}
                        />
                      );
                    })()}
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPinIcon />
                      <span>{p.location || "No location"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t bg-muted/50 p-4">
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                  <div
                    className="flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link href={`/projects/${p.id}`} title="View">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    {canEdit(p) && (
                      <>
                        <ProjectFormDialog
                          initial={p}
                          onCompleted={() => load()}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(p.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {total > limit ? (
        <Pagination>
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
    </div>
  );
}

function MapPinIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
