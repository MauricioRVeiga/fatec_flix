"use client";

import { Heart, Search, Tv } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useFavorites } from "@/hooks/use-favorites";

/**
 * Header (PROJECT.md §31): logo, busca, favoritos, tema. Sticky com
 * backdrop blur, responsivo. Client Component porque busca/favoritos/
 * tema são interativos (PROJECT.md §49).
 */
export function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const { favorites } = useFavorites();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
        >
          <Tv className="size-5 text-primary" aria-hidden="true" />
          <span>Fatec Flix</span>
        </Link>

        <form
          onSubmit={handleSubmit}
          role="search"
          className="order-3 w-full sm:order-2 sm:max-w-sm sm:flex-1"
        >
          <label htmlFor="channel-search" className="sr-only">
            Buscar canais
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="channel-search"
              type="search"
              placeholder="Buscar canais..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-8"
            />
          </div>
        </form>

        <div className="order-2 ml-auto flex items-center gap-1 sm:order-3 sm:ml-0">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Favoritos"
            render={
              <Link href="/favoritos" className="relative">
                <Heart className="size-5" aria-hidden="true" />
                {favorites.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {favorites.length > 9 ? "9+" : favorites.length}
                  </span>
                )}
              </Link>
            }
          />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
