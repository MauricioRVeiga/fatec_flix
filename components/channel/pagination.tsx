import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Paginação simples via links (`?page=N`) — funciona sem JavaScript,
 * prioriza Server Component (PROJECT.md §49).
 */
export function Pagination({
  page,
  pages,
  basePath,
}: {
  page: number;
  pages: number;
  basePath: string;
}) {
  if (pages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        variant="outline"
        size="sm"
        render={
          <Link
            href={`${basePath}${page - 1 > 1 ? `?page=${page - 1}` : ""}`}
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : undefined}
            className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Anterior
          </Link>
        }
      />
      <span className="text-sm text-muted-foreground">
        Página {page} de {pages}
      </span>
      <Button
        variant="outline"
        size="sm"
        render={
          <Link
            href={`${basePath}?page=${page + 1}`}
            aria-disabled={page >= pages}
            tabIndex={page >= pages ? -1 : undefined}
            className={page >= pages ? "pointer-events-none opacity-50" : undefined}
          >
            Próxima
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
    </div>
  );
}
