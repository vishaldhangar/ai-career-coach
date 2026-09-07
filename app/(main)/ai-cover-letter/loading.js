import { Skeleton } from "@/components/ui/skeleton";

export default function CoverLetterLoading() {
  return (
    <div className="space-y-6">
      {/* Page title + button */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Skeleton className="h-14 w-52" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Cover letter cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-36" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
