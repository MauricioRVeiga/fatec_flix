/**
 * Fake mínimo do client `@supabase/supabase-js`, em memória, usado
 * pelos testes de integração (PROJECT.md §67 "Integração") — nunca
 * toca no Supabase real. Implementa só os métodos/encadeamentos que
 * os repositories deste projeto realmente usam (não é um mock geral
 * do PostgREST).
 *
 * Os repositories recebem o client via injeção de dependência
 * (`createXRepository(client)`), então passar este fake no lugar do
 * client real é suficiente — nenhum mock de módulo é necessário.
 */

type Row = Record<string, unknown>;

interface FakeError {
  message: string;
}

export class FakeSupabaseClient {
  private tables = new Map<string, Row[]>();
  private locks = new Map<string, { expiresAt: number }>();

  seed(table: string, rows: Row[]) {
    this.tables.set(
      table,
      rows.map((row) => ({ ...row }))
    );
  }

  getTable(table: string): Row[] {
    return this.tables.get(table) ?? [];
  }

  from(table: string) {
    if (!this.tables.has(table)) {
      this.tables.set(table, []);
    }
    return new FakeQueryBuilder(this.tables.get(table)!);
  }

  async rpc(fn: string, args: Record<string, unknown>) {
    const now = Date.now();

    if (fn === "try_acquire_sync_lock") {
      const name = args.p_sync_type as string;
      const ttlSeconds = (args.p_ttl_seconds as number) ?? 300;
      const existing = this.locks.get(name);

      if (existing && existing.expiresAt > now) {
        return { data: false, error: null };
      }

      this.locks.set(name, { expiresAt: now + ttlSeconds * 1000 });
      return { data: true, error: null };
    }

    if (fn === "release_sync_lock") {
      const name = args.p_sync_type as string;
      const existed = this.locks.delete(name);
      return { data: existed, error: null };
    }

    throw new Error(`FakeSupabaseClient.rpc: função desconhecida "${fn}"`);
  }
}

type Filter = (row: Row) => boolean;

class FakeQueryBuilder<T = Row> implements PromiseLike<{ data: T; error: FakeError | null; count?: number }> {
  private filters: Filter[] = [];
  private orderSpec?: { column: string; ascending: boolean };
  private rangeSpec?: { from: number; to: number };
  private limitSpec?: number;
  private countOption?: "exact";
  private headOnly = false;
  private singleMode?: "single" | "maybeSingle";
  private mode: "select" | "upsert" | "insert" | "update" | "delete" = "select";
  private mutationPayload?: Row | Row[];
  private conflictColumns?: string[];

  constructor(private readonly rows: Row[]) {}

  select(_columns?: string, opts?: { count?: "exact"; head?: boolean }) {
    if (opts?.count) this.countOption = opts.count;
    if (opts?.head) this.headOnly = true;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push((row) => (row[column] as string) < (value as string));
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  /** Parser tosco só para o formato que channel-repository.ts gera: "col.ilike.%termo%,col2.ilike.%termo%". */
  or(expr: string) {
    const clauses = expr.split(",").map((clause) => {
      const [column, , rawPattern] = clause.split(".");
      const pattern = (rawPattern ?? "")
        .replace(/^%/, "")
        .replace(/%$/, "")
        .replace(/\\%/g, "%")
        .replace(/\\_/g, "_")
        .toLowerCase();
      return { column, pattern };
    });

    this.filters.push((row) =>
      clauses.some(({ column, pattern }) => {
        const value = row[column];
        return typeof value === "string" && value.toLowerCase().includes(pattern);
      })
    );
    return this;
  }

  order(column: string, opts: { ascending: boolean }) {
    this.orderSpec = { column, ascending: opts.ascending };
    return this;
  }

  range(from: number, to: number) {
    this.rangeSpec = { from, to };
    return this;
  }

  limit(n: number) {
    this.limitSpec = n;
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  upsert(payload: Row | Row[], opts?: { onConflict?: string }) {
    this.mode = "upsert";
    this.mutationPayload = payload;
    this.conflictColumns = opts?.onConflict?.split(",");
    return this;
  }

  insert(payload: Row | Row[]) {
    this.mode = "insert";
    this.mutationPayload = payload;
    return this;
  }

  update(payload: Row) {
    this.mode = "update";
    this.mutationPayload = payload;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  private matches(row: Row): boolean {
    return this.filters.every((filter) => filter(row));
  }

  private applyOrderAndRange(rows: Row[]): Row[] {
    let result = rows;

    if (this.orderSpec) {
      const { column, ascending } = this.orderSpec;
      result = [...result].sort((a, b) => {
        const av = a[column];
        const bv = b[column];
        if (av === bv) return 0;
        const cmp = (av as string) < (bv as string) ? -1 : 1;
        return ascending ? cmp : -cmp;
      });
    }

    if (this.rangeSpec) {
      result = result.slice(this.rangeSpec.from, this.rangeSpec.to + 1);
    } else if (this.limitSpec !== undefined) {
      result = result.slice(0, this.limitSpec);
    }

    return result;
  }

  private execute(): { data: unknown; error: FakeError | null; count?: number } {
    if (this.mode === "select") {
      const matched = this.rows.filter((row) => this.matches(row));
      const count = this.countOption ? matched.length : undefined;

      if (this.headOnly) {
        return { data: null, error: null, count };
      }

      const paged = this.applyOrderAndRange(matched);

      if (this.singleMode === "maybeSingle") {
        return { data: paged[0] ?? null, error: null, count };
      }

      if (this.singleMode === "single") {
        if (paged.length === 0) {
          return { data: null, error: { message: "no rows found" }, count };
        }
        return { data: paged[0], error: null, count };
      }

      return { data: paged.map((row) => ({ ...row })), error: null, count };
    }

    if (this.mode === "upsert") {
      const incoming = Array.isArray(this.mutationPayload)
        ? this.mutationPayload
        : [this.mutationPayload as Row];
      const conflictColumns = this.conflictColumns ?? ["id"];

      for (const newRow of incoming) {
        const existingIndex = this.rows.findIndex((row) =>
          conflictColumns.every((col) => row[col] === newRow[col])
        );

        if (existingIndex >= 0) {
          this.rows[existingIndex] = { ...this.rows[existingIndex], ...newRow };
        } else {
          this.rows.push({ ...newRow });
        }
      }

      return { data: null, error: null };
    }

    if (this.mode === "insert") {
      const incoming = Array.isArray(this.mutationPayload)
        ? this.mutationPayload
        : [this.mutationPayload as Row];

      const inserted = incoming.map((row) => {
        const withId = { id: this.rows.length + 1, ...row };
        this.rows.push(withId);
        return withId;
      });

      if (this.singleMode) {
        return { data: inserted[0], error: null };
      }
      return { data: inserted, error: null };
    }

    if (this.mode === "update") {
      const updated: Row[] = [];
      for (const row of this.rows) {
        if (this.matches(row)) {
          Object.assign(row, this.mutationPayload);
          updated.push({ ...row });
        }
      }
      return { data: updated, error: null };
    }

    if (this.mode === "delete") {
      const toDelete = this.rows.filter((row) => this.matches(row));
      for (const row of toDelete) {
        const index = this.rows.indexOf(row);
        if (index >= 0) this.rows.splice(index, 1);
      }
      return { data: toDelete, error: null };
    }

    throw new Error(`FakeQueryBuilder: modo desconhecido "${this.mode}"`);
  }

  then<TResult1 = { data: T; error: FakeError | null; count?: number }, TResult2 = never>(
    onFulfilled?:
      | ((value: { data: T; error: FakeError | null; count?: number }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute() as { data: T; error: FakeError | null; count?: number }).then(
      onFulfilled,
      onRejected
    );
  }
}
