import { CardSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="p-6">
      <CardSkeleton showHeader showDescription contentLines={10} />
    </div>
  );
}
