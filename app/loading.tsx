import { ChannelGridSkeleton } from "@/components/channel/channel-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <section key={index} className="flex flex-col gap-3">
          <Skeleton className="h-6 w-40" />
          <ChannelGridSkeleton />
        </section>
      ))}
    </main>
  );
}
