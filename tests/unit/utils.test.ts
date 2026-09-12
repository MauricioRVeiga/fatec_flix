import { describe, expect, it } from "vitest";

import { dedupeBy, groupBy } from "@/lib/utils";

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
