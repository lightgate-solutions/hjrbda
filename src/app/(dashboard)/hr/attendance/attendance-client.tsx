/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  signIn,
  signOut,
  rejectAttendance,
  getAttendanceRecords,
  getMyTodayAttendance,
} from "@/actions/hr/attendance";
import { ChevronDown, ChevronRight, Settings } from "lucide-react";
import Link from "next/link";

interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeName: string | null;
  employeeEmail: string | null;
  employeeDepartment: string | null;
  date: string;
  signInTime: Date | null;
  signOutTime: Date | null;
  signInLatitude: string | null;
  signInLongitude: string | null;
  signInLocation: string | null;
  status: "Approved" | "Rejected" | string;
  rejectionReason: string | null;
  rejectedBy: number | null;
}

interface AttendanceClientProps {
  myAttendance: any;
  allAttendance: {
    attendance: AttendanceRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
  isManagerOrHR: boolean;
  currentEmployeeId: number;
  managerIdFilter?: number;
  settings: {
    signInStartTime: string;
    signInEndTime: string;
    signOutStartTime: string;
    signOutEndTime: string;
  };
  isHROrAdmin: boolean;
}

export default function AttendanceClient({
  myAttendance: initialMyAttendance,
  allAttendance: initialAllAttendance,
  isManagerOrHR,
  currentEmployeeId,
  managerIdFilter,
  settings,
  isHROrAdmin,
}: AttendanceClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<
    number | null
  >(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [page, _setPage] = useState(1);

  // State for collapsible sections - default all open
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
    4: true, // Mon-Fri indices (0-4 relative to start of week)
  });

  const toggleDay = (index: string) => {
    setOpenDays((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Query for My Attendance
  const { data: myAttendance } = useQuery({
    queryKey: ["myAttendance", currentEmployeeId],
    queryFn: () => getMyTodayAttendance(),
    initialData: initialMyAttendance,
  });

  // Query for All Attendance (HR/Manager)
  const { data: allAttendanceData } = useQuery({
    queryKey: ["allAttendance", page, managerIdFilter],
    queryFn: () =>
      getAttendanceRecords({
        page,
        limit: 50, // Increase limit to show more records for the week
        managerId: managerIdFilter,
      }),
    initialData: initialAllAttendance,
    enabled: isManagerOrHR,
  });

  // Mutations
  const signInMutation = useMutation({
    mutationFn: ({
      employeeId,
      location,
    }: {
      employeeId: number;
      location?: {
        latitude: number;
        longitude: number;
        address?: string;
      };
    }) => signIn(employeeId, location),
    onSuccess: (res) => {
      if (res.error) {
        toast.error(res.error.reason);
      } else {
        toast.success(res.success?.reason);
        queryClient.invalidateQueries({ queryKey: ["myAttendance"] });
        queryClient.invalidateQueries({ queryKey: ["allAttendance"] });
        router.refresh();
      }
    },
    onError: () => toast.error("Failed to sign in"),
  });

  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: (res) => {
      if (res.error) {
        toast.error(res.error.reason);
      } else {
        toast.success(res.success?.reason);
        queryClient.invalidateQueries({ queryKey: ["myAttendance"] });
        queryClient.invalidateQueries({ queryKey: ["allAttendance"] });
        router.refresh();
      }
    },
    onError: () => toast.error("Failed to sign out"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      rejectAttendance(id, reason),
    onSuccess: (res) => {
      if (res.error) {
        toast.error(res.error.reason);
      } else {
        toast.success(res.success?.reason);
        setIsRejectDialogOpen(false);
        setRejectionReason("");
        setSelectedAttendanceId(null);
        queryClient.invalidateQueries({ queryKey: ["allAttendance"] });
        router.refresh();
      }
    },
    onError: () => toast.error("Failed to reject attendance"),
  });

  const handleSignIn = () => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    // Get user's location
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Optional: Reverse geocode to get address (if you want to add this later)
        // For now, we'll just use coordinates
        signInMutation.mutate({
          employeeId: currentEmployeeId,
          location: {
            latitude,
            longitude,
          },
        });
      },
      (error) => {
        // If location access is denied or fails, show error
        let errorMessage = "Failed to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location access denied. Please enable location services to sign in.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const handleSignOut = () => {
    signOutMutation.mutate(currentEmployeeId);
  };

  const handleReject = () => {
    if (!selectedAttendanceId || !rejectionReason) return;
    rejectMutation.mutate({
      id: selectedAttendanceId,
      reason: rejectionReason,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "Rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Helper to get current week days (Mon-Fri)
  const getCurrentWeekDays = () => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const days = [];
    for (let i = 0; i < 5; i++) {
      days.push(addDays(start, i));
    }
    return days;
  };

  const weekDays = getCurrentWeekDays();

  // Group records by date
  const getRecordsForDate = (date: Date) => {
    if (!allAttendanceData?.attendance) return [];
    return allAttendanceData.attendance.filter((record) =>
      isSameDay(parseISO(record.date), date),
    );
  };

  return (
    <div className="space-y-8">
      {/* My Attendance Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Attendance</CardTitle>
              <CardDescription>
                Sign in between {settings.signInStartTime} -{" "}
                {settings.signInEndTime}. Sign out between{" "}
                {settings.signOutStartTime} - {settings.signOutEndTime}.
              </CardDescription>
            </div>
            {isHROrAdmin && (
              <Link href="/hr/attendance/settings">
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Current Status
            </p>
            <div className="flex items-center gap-2">
              {myAttendance ? (
                <>
                  <Badge variant="outline">
                    {format(new Date(myAttendance.date), "PPP")}
                  </Badge>
                  {myAttendance.signInTime && (
                    <Badge variant="secondary">
                      In: {format(new Date(myAttendance.signInTime), "p")}
                    </Badge>
                  )}
                  {myAttendance.signOutTime && (
                    <Badge variant="secondary">
                      Out: {format(new Date(myAttendance.signOutTime), "p")}
                    </Badge>
                  )}
                  {getStatusBadge(myAttendance.status)}
                </>
              ) : (
                <span className="text-sm">Not signed in today</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSignIn}
              disabled={signInMutation.isPending || !!myAttendance}
            >
              Sign In
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              disabled={
                signOutMutation.isPending ||
                !myAttendance ||
                !!myAttendance.signOutTime ||
                myAttendance.status === "Rejected"
              }
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* HR/Manager Section - Collapsible Weekly View */}
      {isManagerOrHR && (
        <Card>
          <CardHeader>
            <CardTitle>Employee Attendance (Current Week)</CardTitle>
            <CardDescription>
              Manage and review employee attendance records for this week.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {weekDays.map((day, index) => {
              const records = getRecordsForDate(day);
              const isOpen = openDays[index] ?? false;

              return (
                <Collapsible
                  key={day.toISOString()}
                  open={isOpen}
                  onOpenChange={() => toggleDay(index.toString())}
                  className="border rounded-md"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 font-medium">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {format(day, "EEEE, MMMM do")}
                      </div>
                      <Badge variant="secondary">
                        {records.length} Records
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Sign In</TableHead>
                            <TableHead>Sign Out</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {records.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="text-center text-muted-foreground"
                              >
                                No records for this day
                              </TableCell>
                            </TableRow>
                          ) : (
                            records.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {record.employeeName}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {record.employeeDepartment}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {record.signInTime
                                    ? format(new Date(record.signInTime), "p")
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {record.signOutTime
                                    ? format(new Date(record.signOutTime), "p")
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {record.signInLatitude &&
                                  record.signInLongitude ? (
                                    <a
                                      href={`https://www.google.com/maps?q=${record.signInLatitude},${record.signInLongitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:underline"
                                      title={`Lat: ${record.signInLatitude}, Lng: ${record.signInLongitude}`}
                                    >
                                      View Map
                                    </a>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(record.status)}
                                </TableCell>
                                <TableCell>
                                  {record.status !== "Rejected" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => {
                                        setSelectedAttendanceId(record.id);
                                        setIsRejectDialogOpen(true);
                                      }}
                                    >
                                      Reject
                                    </Button>
                                  )}
                                  {record.status === "Rejected" && (
                                    <span
                                      className="text-xs text-muted-foreground"
                                      title={record.rejectionReason || ""}
                                    >
                                      Rejected
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Attendance</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this attendance record.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Late arrival without notice"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason || rejectMutation.isPending}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
