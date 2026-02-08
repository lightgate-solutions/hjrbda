"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Briefcase, Mail } from "lucide-react";
import Link from "next/link";

export default function GeneralDashboard() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to HJRBDA's Management System
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Access and manage documents
            </p>
            <Link
              href="/documents"
              className="text-primary hover:underline text-sm font-medium"
            >
              View Documents →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="size-5" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View and manage projects
            </p>
            <Link
              href="/projects"
              className="text-primary hover:underline text-sm font-medium"
            >
              View Projects →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-5" />
              Mail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Check your emails
            </p>
            <Link
              href="/mail/inbox"
              className="text-primary hover:underline text-sm font-medium"
            >
              View Mail →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
