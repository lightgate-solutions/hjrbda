import EmployeesTable from "@/components/hr/employees-table";
import EmployeesTableSkeleton from "@/components/hr/employees-table-skeleton";
import { Suspense } from "react";

export default async function Page() {
  return (
    <div className="">
      <Suspense fallback={<EmployeesTableSkeleton />}>
        <EmployeesTable />
      </Suspense>
    </div>
  );
}
