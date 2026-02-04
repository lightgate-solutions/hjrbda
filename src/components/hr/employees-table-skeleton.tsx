"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeesTableSkeleton() {
  // Create an array of 10 items for skeleton rows
  const skeletonRows = Array.from({ length: 10 }, (_, i) => i);

  return (
    <section className="max-w-4xl">
      <Card className=" shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            <Skeleton className="h-7 w-32" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-5 w-96" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Skeleton className="h-5 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-5 w-16" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-5 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-5 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-5 w-16" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-5 w-32" />
                </TableHead>
                <TableHead className="text-right">
                  <Skeleton className="h-5 w-16 ml-auto" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skeletonRows.map((index) => (
                <TableRow key={index}>
                  {/* Employee */}
                  <TableCell className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-3 w-16 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>

                  {/* Department */}
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>

                  {/* Email */}
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>

                  {/* Phone */}
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>

                  {/* Employment Type */}
                  <TableCell>
                    <Skeleton className="h-6 w-24" />
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="flex space-x-2 text-right">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
