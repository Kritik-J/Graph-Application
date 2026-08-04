import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-3 h-10 w-[26rem] max-w-full" />
      <Skeleton className="mt-3 h-4 w-full max-w-2xl" />

      <div className="mt-8 grid grid-cols-2 gap-px border border-divider bg-divider lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[78px]" />
        ))}
      </div>

      <Skeleton className="mt-6 h-[560px]" />
    </div>
  );
}
