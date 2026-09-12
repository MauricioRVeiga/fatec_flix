"use client";

import { useSyncExternalStore } from "react";

/**
 * Favoritos em localStorage (PROJECT.md §13). Abstração isolada atrás
 * de `useFavorites()` para permitir mover para Supabase Auth no
 * futuro sem tocar nos componentes que a usam.
 */

const STORAGE_KEY = "fatec-flix:favorites";

type Listener = () => void;

const listeners = new Set<Listener>();
let cachedSnapshot: string[] = [];
let cachedRaw: string | null = null;

function readFromStorage(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    // Evita recriar o array (e disparar re-render) quando o conteúdo
    // não mudou — useSyncExternalStore compara por referência.
    if (raw === cachedRaw) {
      return cachedSnapshot;
    }

    cachedRaw = raw;
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedSnapshot = Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    cachedSnapshot = [];
  }

  return cachedSnapshot;
}

function writeToStorage(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage indisponível (modo privado, cota excedida, etc.)
    // — falha silenciosamente, favoritos só não persistem.
  }

  cachedRaw = null; // força releitura na próxima notificação
  notifyListeners();
}

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cachedRaw = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// Precisa ser uma referência estável — useSyncExternalStore compara
// por igualdade referencial, e devolver `[]` novo a cada chamada faz
// o React reportar risco de loop infinito.
const EMPTY_FAVORITES: string[] = [];

function getServerSnapshot(): string[] {
  return EMPTY_FAVORITES;
}

export interface FavoritesStore {
  favorites: string[];
  add: (channelId: string) => void;
  remove: (channelId: string) => void;
  toggle: (channelId: string) => void;
  isFavorite: (channelId: string) => boolean;
}

export function useFavorites(): FavoritesStore {
  const favorites = useSyncExternalStore(subscribe, readFromStorage, getServerSnapshot);

  return {
    favorites,
    add(channelId: string) {
      if (!favorites.includes(channelId)) {
        writeToStorage([...favorites, channelId]);
      }
    },
    remove(channelId: string) {
      writeToStorage(favorites.filter((id) => id !== channelId));
    },
    toggle(channelId: string) {
      if (favorites.includes(channelId)) {
        writeToStorage(favorites.filter((id) => id !== channelId));
      } else {
        writeToStorage([...favorites, channelId]);
      }
    },
    isFavorite(channelId: string) {
      return favorites.includes(channelId);
    },
  };
}
