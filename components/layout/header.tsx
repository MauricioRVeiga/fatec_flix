"use client";

import { Film, Heart, Search, Tv } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FatecFlixLogo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { features } from "@/config/features";
import { useFavorites } from "@/hooks/use-favorites";
import { formatRelativeTime } from "@/lib/utils";

export function HeaderFallback() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname.startsWith("/admin")) return null;
  return <div className="h-16 border-b border-border/60" />;
}

export function Header({ lastSyncTimeIso }: { lastSyncTimeIso: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const { favorites } = useFavorites();
  const lastSyncLabel = lastSyncTimeIso ? formatRelativeTime(new Date(lastSyncTimeIso)) : null;
  const searchSection = pathname.startsWith("/filmes") || pathname.startsWith("/filme/")
    ? "movies"
    : pathname.startsWith("/series") || pathname.startsWith("/serie/")
      ? "series"
      : "channels";

  if (pathname.startsWith("/admin") || pathname === "/login") {
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    const basePath =
      searchSection === "movies" ? "/filmes" : searchSection === "series" ? "/series" : "/";
    router.push(trimmed ? `${basePath}?q=${encodeURIComponent(trimmed)}` : basePath);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
        >
          <FatecFlixLogo className="size-7" />
          <span>Fatec Flix</span>
        </Link>

        <nav className="order-2 flex items-center gap-1" aria-label="Conteúdo principal">
          <Button
            variant={searchSection === "channels" ? "secondary" : "ghost"}
            size="sm"
            nativeButton={false}
            render={<Link href="/"><Tv aria-hidden="true" /> Ao vivo</Link>}
          />
          {features.vod && (
            <>
              <Button
                variant={searchSection === "movies" ? "secondary" : "ghost"}
                size="sm"
                nativeButton={false}
                render={<Link href="/filmes"><Film aria-hidden="true" /> Filmes</Link>}
              />
              <Button
                variant={searchSection === "series" ? "secondary" : "ghost"}
                size="sm"
                nativeButton={false}
                render={<Link href="/series">Séries</Link>}
              />
            </>
          )}
        </nav>

        {lastSyncLabel && (
          <span className="hidden shrink-0 text-[11px] text-muted-foreground md:inline">
            Programação atualizada {lastSyncLabel}
          </span>
        )}

        <form
          onSubmit={handleSubmit}
          role="search"
          className="order-3 w-full sm:order-2 sm:max-w-sm sm:flex-1"
        >
          <label htmlFor="catalog-search" className="sr-only">
            Buscar no catálogo atual
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="catalog-search"
              type="search"
              placeholder={
                searchSection === "movies"
                  ? "Buscar filmes..."
                  : searchSection === "series"
                    ? "Buscar séries..."
                    : "Buscar canais..."
              }
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
            nativeButton={false}
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
