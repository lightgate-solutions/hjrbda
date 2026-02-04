"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  listProjectTasks,
  updateProjectTaskStatus,
  deleteProjectTask,
} from "@/actions/project-tasks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, Trash2, Edit, Calendar, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProjectTaskForm from "./project-task-form";
import { toast } from "sonner";

const COLUMNS = [
  { id: "Todo", title: "To Do" },
  { id: "In Progress", title: "In Progress" },
  { id: "Review", title: "Review" },
  { id: "Completed", title: "Completed" },
];

interface ProjectTaskBoardProps {
  projectId: number;
  members: any[];
  milestones: any[];
  isEditable: boolean;
}

export default function ProjectTaskBoard({
  projectId,
  members,
  milestones,
  isEditable,
}: ProjectTaskBoardProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProjectTasks(projectId);
      setTasks(data);
    } catch (_error) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const newStatus = destination.droppableId as any;
    const taskId = Number(draggableId);

    // Optimistic update
    const updatedTasks = [...tasks];
    const taskIndex = updatedTasks.findIndex((t) => t.id === taskId);
    if (taskIndex !== -1) {
      updatedTasks[taskIndex].status = newStatus;
      setTasks(updatedTasks);
    }

    const res = await updateProjectTaskStatus(taskId, newStatus);
    if (!res.success) {
      toast.error(res.error?.reason || "Failed to update status");
      fetchTasks(); // Rollback
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    const res = await deleteProjectTask(taskId);
    if (res.success) {
      toast.success("Task deleted");
      fetchTasks();
    } else {
      toast.error(res.error?.reason || "Failed to delete task");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Urgent":
        return "bg-destructive text-destructive-foreground";
      case "High":
        return "bg-orange-500 text-white";
      case "Medium":
        return "bg-blue-500 text-white";
      case "Low":
        return "bg-slate-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  if (loading && tasks.length === 0)
    return <div className="p-8 text-center">Loading tasks...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Project Tasks</h2>
        {isEditable && (
          <Button
            onClick={() => {
              setSelectedTask(null);
              setIsFormOpen(true);
            }}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
          {COLUMNS.map((column) => (
            <div
              key={column.id}
              className="flex-1 min-w-[280px] bg-muted/30 rounded-lg p-3"
            >
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                  {column.title}
                  <span className="ml-2 px-2 py-0.5 text-xs bg-muted rounded-full">
                    {tasks.filter((t) => t.status === column.id).length}
                  </span>
                </h3>
              </div>

              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3 min-h-[100px]"
                  >
                    {tasks
                      .filter((t) => t.status === column.id)
                      .map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={String(task.id)}
                          index={index}
                        >
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="shadow-sm hover:shadow-md transition-shadow group"
                            >
                              <CardContent className="p-3 space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                  <Badge
                                    className={getPriorityColor(task.priority)}
                                  >
                                    {task.priority}
                                  </Badge>
                                  {isEditable && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedTask(task);
                                            setIsFormOpen(true);
                                          }}
                                        >
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleDelete(task.id)}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>

                                <div>
                                  <h4 className="font-medium text-sm leading-snug">
                                    {task.title}
                                  </h4>
                                  {task.milestone && (
                                    <p className="text-[10px] text-primary font-semibold mt-1">
                                      {task.milestone.title}
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-col gap-2 pt-1 border-t mt-2">
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <User className="h-3 w-3 mr-1" />
                                    {task.assignedTo?.name}
                                  </div>
                                  {task.dueDate && (
                                    <div className="flex items-center text-xs text-muted-foreground">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {new Date(
                                        task.dueDate,
                                      ).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTask ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          <ProjectTaskForm
            projectId={projectId}
            members={members}
            milestones={milestones}
            task={selectedTask}
            onSuccess={() => {
              setIsFormOpen(false);
              fetchTasks();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
