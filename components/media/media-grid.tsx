import { MediaCard, type MediaCardItem } from "./media-card";

export function MediaGrid({ items }: { items: MediaCardItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item, index) => (
        <MediaCard key={`${item.type}-${item.id}`} item={item} priority={index < 6} />
      ))}
    </div>
  );
}

