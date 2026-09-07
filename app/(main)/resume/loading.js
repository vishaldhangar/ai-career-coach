import { Skeleton } from "@/components/ui/skeleton";

export default function ResumeLoading() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Skeleton className="h-14 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b pb-2">
        <Skeleton className="h-9 w-28 rounded-t-md" />
        <Skeleton className="h-9 w-28 rounded-t-md" />
      </div>

      {/* Editor area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form side */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>

        {/* Preview side */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <div className="border-t pt-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" style={{ width: `${75 + (i % 3) * 10}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
