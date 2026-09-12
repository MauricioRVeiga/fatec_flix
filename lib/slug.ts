/**
 * Utilitário de slug (PROJECT.md §43) — páginas de categoria nunca
 * devem depender do nome formatado ("Filmes e Séries") pra buscar no
 * banco; usam o slug ("filmes-e-series") na URL e resolvem de volta
 * pro nome real comparando slugs.
 */

// Marcas diacríticas combinantes (acentos) depois de normalizar em
// NFD — construído com `new RegExp` + escape \u explícito (em vez de
// um regex literal com o caractere combinante embutido no arquivo)
// pra garantir exatamente esses code points, sem depender de como o
// editor/terminal exibe um combining mark invisível.
const COMBINING_DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
