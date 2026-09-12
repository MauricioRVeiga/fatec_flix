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
