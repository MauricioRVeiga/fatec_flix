"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const THEME_STORAGE_KEY = "fatec-flix:theme";

type Theme = "dark" | "light";

const listeners = new Set<() => void>();

/**
 * A classe `dark` no `<html>` é o "sistema externo" aqui — já é
 * aplicada antes da hidratação pelo script inline em app/layout.tsx.
 * `useSyncExternalStore` sincroniza o ícone com ela sem precisar de
 * `setState` dentro de um `useEffect` (o próprio React já resolve a
 * re-leitura pós-hidratação, evitando tanto mismatch quanto o
 * anti-padrão de setState síncrono em efeito).
 */
function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "dark";
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function setTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage indisponível — o tema só não persiste entre sessões.
  }

  for (const listener of listeners) {
    listener();
  }
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
