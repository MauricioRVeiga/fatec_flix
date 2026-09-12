import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export interface CategoryCount {
  name: string;
  count: number;
}

/**
 * Categorias derivadas da tabela `channels` (PROJECT.md §28
 * `/api/categories`). Com ~100 canais, agregar em memória é mais
 * simples e barato do que manter uma view/RPC só para isso — dá para
 * revisitar se o catálogo crescer muito.
 */
export function createCategoryRepository(client: SupabaseClient<Database>) {
  return {
    async listWithCounts(): Promise<CategoryCount[]> {
      const { data, error } = await client
        .from("channels")
        .select("category")
        .eq("active", true);

      if (error) {
        throw error;
      }

      const counts = new Map<string, number>();

      for (const row of data ?? []) {
        if (!row.category) {
          continue;
        }

        counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
      }

      return [...counts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    },
  };
}

export type CategoryRepository = ReturnType<typeof createCategoryRepository>;
