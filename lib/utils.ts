export { cn } from "cn";

/**
 * Remove duplicatas por chave, mantendo a última ocorrência. Usado
 * antes de `upsert(..., { onConflict })` — o Postgres lança
 * "ON CONFLICT DO UPDATE command cannot affect row a second time" se
 * o próprio lote enviado tiver duas linhas com a mesma chave de
 * conflito (ex.: upstream repetindo um canal/embed na mesma resposta).
 */
export function dedupeBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const map = new Map<string, T>();

  for (const item of items) {
    map.set(keyFn(item), item);
  }

  return [...map.values()];
}

/**
 * "Programação atualizada há 18 minutos" (PROJECT.md §76) — nunca
 * mais preciso que minutos, é só pra dar uma noção discreta de
 * frescor, não um relógio.
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) {
    return "agora mesmo";
  }
  if (diffMin < 60) {
    return `há ${diffMin} minuto${diffMin === 1 ? "" : "s"}`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `há ${diffHour} hora${diffHour === 1 ? "" : "s"}`;
  }

  const diffDay = Math.floor(diffHour / 24);
  return `há ${diffDay} dia${diffDay === 1 ? "" : "s"}`;
}

export function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();

  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key);

    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  }

  return map;
}
