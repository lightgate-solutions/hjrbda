"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { updateAttendanceSettings } from "@/actions/hr/attendance";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AttendanceSettingsClientProps {
  settings: {
    signInStartTime?: string;
    signInEndTime?: string;
    signOutStartTime?: string;
    signOutEndTime?: string;
    // Legacy support for old format
    signInStartHour?: number;
    signInEndHour?: number;
    signOutStartHour?: number;
    signOutEndHour?: number;
  };
}

export default function AttendanceSettingsClient({
  settings: initialSettings,
}: AttendanceSettingsClientProps) {
  const router = useRouter();

  // Convert legacy format to time strings if needed
  const convertLegacyTime = (hour?: number) =>
    hour !== undefined ? `${hour.toString().padStart(2, "0")}:00` : "";

  const [signInStartTime, setSignInStartTime] = useState(
    initialSettings.signInStartTime ||
      convertLegacyTime(initialSettings.signInStartHour) ||
      "06:00",
  );
  const [signInEndTime, setSignInEndTime] = useState(
    initialSettings.signInEndTime ||
      convertLegacyTime(initialSettings.signInEndHour) ||
      "09:00",
  );
  const [signOutStartTime, setSignOutStartTime] = useState(
    initialSettings.signOutStartTime ||
      convertLegacyTime(initialSettings.signOutStartHour) ||
      "14:00",
  );
  const [signOutEndTime, setSignOutEndTime] = useState(
    initialSettings.signOutEndTime ||
      convertLegacyTime(initialSettings.signOutEndHour) ||
      "20:00",
  );

  const updateMutation = useMutation({
    mutationFn: (settings: {
      signInStartTime: string;
      signInEndTime: string;
      signOutStartTime: string;
      signOutEndTime: string;
    }) => updateAttendanceSettings(settings),
    onSuccess: (res) => {
      if (res.error) {
        toast.error(res.error.reason);
      } else {
        toast.success(res.success?.reason);
        router.refresh();
      }
    },
    onError: () => toast.error("Failed to update settings"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert to minutes for validation
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const signInStart = parseTime(signInStartTime);
    const signInEnd = parseTime(signInEndTime);
    const signOutStart = parseTime(signOutStartTime);
    const signOutEnd = parseTime(signOutEndTime);

    // Client-side validation
    if (signInStart >= signInEnd) {
      toast.error("Sign-in start time must be before end time");
      return;
    }
    if (signOutStart >= signOutEnd) {
      toast.error("Sign-out start time must be before end time");
      return;
    }

    updateMutation.mutate({
      signInStartTime,
      signInEndTime,
      signOutStartTime,
      signOutEndTime,
    });
  };

  return (
    <div className="space-y-4">
      <Link href="/hr/attendance">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Attendance
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Configure Attendance Time Windows</CardTitle>
          <CardDescription>
            Set the allowed time windows for employees to sign in and sign out.
            All times are in 24-hour format.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sign In Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Sign In Window</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signInStartTime">Start Time</Label>
                  <Input
                    id="signInStartTime"
                    type="time"
                    value={signInStartTime}
                    onChange={(e) => setSignInStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signInEndTime">End Time</Label>
                  <Input
                    id="signInEndTime"
                    type="time"
                    value={signInEndTime}
                    onChange={(e) => setSignInEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Employees can sign in between {signInStartTime} and{" "}
                {signInEndTime}
              </p>
            </div>

            {/* Sign Out Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Sign Out Window</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signOutStartTime">Start Time</Label>
                  <Input
                    id="signOutStartTime"
                    type="time"
                    value={signOutStartTime}
                    onChange={(e) => setSignOutStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signOutEndTime">End Time</Label>
                  <Input
                    id="signOutEndTime"
                    type="time"
                    value={signOutEndTime}
                    onChange={(e) => setSignOutEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Employees can sign out between {signOutStartTime} and{" "}
                {signOutEndTime}
              </p>
            </div>

            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
