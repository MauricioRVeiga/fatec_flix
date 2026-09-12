import { Skeleton } from "@/components/ui/skeleton";

export function ChannelCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

export function ChannelGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <ChannelCardSkeleton key={index} />
      ))}
    </div>
  );
}
