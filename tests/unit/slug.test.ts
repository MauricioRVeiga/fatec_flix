import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("remove acentos e coloca em minúsculo", () => {
    expect(slugify("Notícias")).toBe("noticias");
    expect(slugify("Documentários")).toBe("documentarios");
  });

  it("troca espaços por hífen", () => {
    expect(slugify("Filmes e Séries")).toBe("filmes-e-series");
    expect(slugify("Canais Abertos")).toBe("canais-abertos");
  });

  it("categorias já simples ficam praticamente iguais, só minúsculas", () => {
    expect(slugify("Esportes")).toBe("esportes");
    expect(slugify("Infantil")).toBe("infantil");
    expect(slugify("Entretenimento")).toBe("entretenimento");
  });

  it("remove pontuação e caracteres especiais", () => {
    expect(slugify("Ação & Aventura!")).toBe("acao-aventura");
  });

  it("não deixa hífen sobrando no início/fim", () => {
    expect(slugify("  Esportes  ")).toBe("esportes");
    expect(slugify("-Esportes-")).toBe("esportes");
  });

  it("é idempotente e determinístico (mesmo nome sempre gera o mesmo slug)", () => {
    expect(slugify("Filmes e Séries")).toBe(slugify("Filmes e Séries"));
  });
});
