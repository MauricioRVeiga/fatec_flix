import { describe, expect, it } from "vitest";

import {
  dedupeBy,
  formatRelativeTime,
  groupBy,
  sanitizeNextPath,
  toErrorMessage,
} from "@/lib/utils";

describe("dedupeBy", () => {
  it("mantém a última ocorrência de cada chave", () => {
    const items = [
      { id: "a", value: 1 },
      { id: "b", value: 2 },
      { id: "a", value: 3 },
    ];

    const result = dedupeBy(items, (item) => item.id);

    expect(result).toHaveLength(2);
    expect(result.find((item) => item.id === "a")?.value).toBe(3);
  });

  it("lista vazia retorna lista vazia", () => {
    expect(dedupeBy([], () => "x")).toEqual([]);
  });

  it("sem duplicatas retorna a mesma quantidade de itens", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(dedupeBy(items, (item) => item.id)).toHaveLength(3);
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-09-12T12:00:00Z");

  it("menos de 1 minuto retorna 'agora mesmo'", () => {
    const date = new Date("2026-09-12T11:59:30Z");
    expect(formatRelativeTime(date, now)).toBe("agora mesmo");
  });

  it("minutos no singular", () => {
    const date = new Date("2026-09-12T11:59:00Z");
    expect(formatRelativeTime(date, now)).toBe("há 1 minuto");
  });

  it("minutos no plural", () => {
    const date = new Date("2026-09-12T11:42:00Z");
    expect(formatRelativeTime(date, now)).toBe("há 18 minutos");
  });

  it("horas no plural", () => {
    const date = new Date("2026-09-12T09:00:00Z");
    expect(formatRelativeTime(date, now)).toBe("há 3 horas");
  });

  it("dias no plural", () => {
    const date = new Date("2026-09-10T12:00:00Z");
    expect(formatRelativeTime(date, now)).toBe("há 2 dias");
  });
});

describe("groupBy", () => {
  it("agrupa itens pela chave", () => {
    const items = [
      { category: "Esportes", name: "A" },
      { category: "Notícias", name: "B" },
      { category: "Esportes", name: "C" },
    ];

    const grouped = groupBy(items, (item) => item.category);

    expect(grouped.get("Esportes")).toHaveLength(2);
    expect(grouped.get("Notícias")).toHaveLength(1);
    expect(grouped.get("Inexistente")).toBeUndefined();
  });
});

describe("toErrorMessage", () => {
  it("extrai .message de um Error", () => {
    expect(toErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("retorna a string diretamente quando o erro já é uma string", () => {
    expect(toErrorMessage("algo deu errado")).toBe("algo deu errado");
  });

  it("extrai .message de um objeto parecido com erro que não é instanceof Error", () => {
    expect(toErrorMessage({ message: "falha duck-typed" })).toBe("falha duck-typed");
  });

  it("serializa um objeto sem .message em vez de virar '[object Object]'", () => {
    expect(toErrorMessage({ code: "23505", detail: "duplicate key" })).toBe(
      '{"code":"23505","detail":"duplicate key"}'
    );
  });

  it("nunca retorna a string inútil '[object Object]'", () => {
    expect(toErrorMessage({})).not.toBe("[object Object]");
  });
});

describe("sanitizeNextPath", () => {
  it("aceita um caminho interno simples", () => {
    expect(sanitizeNextPath("/canal/globo")).toBe("/canal/globo");
  });

  it("aceita um caminho interno com query string", () => {
    expect(sanitizeNextPath("/categoria/esportes?page=2")).toBe(
      "/categoria/esportes?page=2"
    );
  });

  it("retorna '/' quando o valor é null", () => {
    expect(sanitizeNextPath(null)).toBe("/");
  });

  it("retorna '/' quando o valor não começa com '/'", () => {
    expect(sanitizeNextPath("evil.com")).toBe("/");
  });

  it("rejeita URL protocol-relative (open redirect via '//')", () => {
    expect(sanitizeNextPath("//evil.com")).toBe("/");
  });

  it("rejeita o truque de barra invertida ('/\\evil.com')", () => {
    expect(sanitizeNextPath("/\\evil.com")).toBe("/");
  });

  it("rejeita URL absoluta com esquema", () => {
    expect(sanitizeNextPath("https://evil.com")).toBe("/");
  });
});
