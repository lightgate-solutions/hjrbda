"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Shield, Calendar } from "lucide-react";
import { format } from "date-fns";

interface UserProfileCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string | null | undefined;
    createdAt: Date;
  };
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Your account details are displayed below (read-only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Name
          </Label>
          <Input
            id="name"
            value={user.name}
            readOnly
            disabled
            className="bg-muted"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </Label>
          <Input
            id="email"
            value={user.email}
            readOnly
            disabled
            className="bg-muted"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="role" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role
          </Label>
          <div className="flex items-center">
            <Badge variant="secondary" className="text-sm capitalize">
              {user.role || "No role assigned"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="createdAt" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Member Since
          </Label>
          <Input
            id="createdAt"
            value={format(new Date(user.createdAt), "MMMM dd, yyyy")}
            readOnly
            disabled
            className="bg-muted"
          />
        </div>
      </CardContent>
    </Card>
  );
}
