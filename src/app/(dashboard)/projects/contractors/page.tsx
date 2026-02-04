import ContractorsTable from "@/components/projects/contractors/contractors-table";
import { Suspense } from "react";

export default function ContractorsPage() {
  return (
    <div className="p-6">
      <Suspense fallback={<div>Loading...</div>}>
        <ContractorsTable />
      </Suspense>
    </div>
  );
}
