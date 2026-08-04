import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="flex min-h-[calc(100vh-54px)] flex-col lg:flex-row">
      <div className="w-full shrink-0 space-y-3 border-b-2 border-divider p-4 lg:w-[302px] lg:border-r-2 lg:border-b-0">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
      <div className="rp-grid flex-1" />
      <div className="w-full shrink-0 space-y-3 border-t-2 border-divider p-4 lg:w-[300px] lg:border-t-0 lg:border-l-2">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    </div>
  );
}
