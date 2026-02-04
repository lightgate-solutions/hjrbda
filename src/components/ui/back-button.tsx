import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({
  href = "/",
  label = "Back to Dashboard",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link href={href}>
      <Button variant="ghost" size="sm" className="gap-2">
        <ArrowLeft className="size-4" />
        {label}
      </Button>
    </Link>
  );
}
