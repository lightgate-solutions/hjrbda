/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Mail, MapPin, Phone, User } from "lucide-react";

export default function EmployeeProfileView({ employee }: { employee: any }) {
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (_error) {
      return dateString || "-";
    }
  };

  const hireDate = employee.startDate;

  return (
    <div className="space-y-8">
      {/* Header with avatar and basic info */}
      <div className="flex items-start gap-6">
        <Avatar className="h-24 w-24 border-4 border-primary/10">
          <AvatarImage src={employee.photo || ""} alt={employee.name} />
          <AvatarFallback className="text-xl">
            {employee.name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold">{employee.name}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {employee.role} • {employee.department}
          </p>

          <div className="flex gap-2 mt-2">
            <Badge variant={employee.employmentType ? "default" : "outline"}>
              {employee.employmentType || "No employment type"}
            </Badge>

            {employee.isManager && <Badge variant="secondary">Manager</Badge>}

            {employee.status && (
              <Badge
                variant={
                  employee.status === "Active" ? "default" : "destructive"
                }
              >
                {employee.status}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{employee.email || "-"}</p>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{employee.phone || "-"}</p>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-sm">{employee.address || "-"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Staff Number</p>
                <p className="text-sm font-medium">
                  {employee.staffNumber || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-medium">{employee.status || "-"}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Hire Date</p>
                <p className="text-sm font-medium">{hireDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personal Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Date of Birth</p>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm">
                  {formatDate(employee.dateOfBirth) || "-"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Marital Status</p>
              <p className="text-sm">{employee.maritalStatus || "-"}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Department</p>
              <p className="text-sm font-medium">
                {employee.department || "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
