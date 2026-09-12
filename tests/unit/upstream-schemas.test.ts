import { describe, expect, it } from "vitest";

import {
  channelSchema,
  embedSchema,
  upstreamChannelsResponseSchema,
} from "@/lib/upstream/schemas";

import fixtures from "../fixtures/channels.json";

describe("channelSchema — fixtures válidas", () => {
  it.each(fixtures.data)("aceita o fixture $id", (channel) => {
    const result = channelSchema.safeParse(channel);
    expect(result.success).toBe(true);
  });

  it("o envelope da resposta (success/data/total) também é válido", () => {
    const result = upstreamChannelsResponseSchema.safeParse(fixtures);
    expect(result.success).toBe(true);
  });
});

describe("channelSchema — casos inválidos (PROJECT.md §19, §57)", () => {
  it("rejeita id vazio", () => {
    const result = channelSchema.safeParse({
      id: "",
      name: "Canal",
      embeds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejeita logo_url com esquema javascript:", () => {
    const result = channelSchema.safeParse({
      id: "canal-malicioso",
      name: "Canal",
      logo_url: "javascript:alert(1)",
      embeds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejeita logo_url com esquema data:", () => {
    const result = channelSchema.safeParse({
      id: "canal-malicioso",
      name: "Canal",
      logo_url: "data:text/html,<script>alert(1)</script>",
      embeds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejeita logo_url http (não https)", () => {
    const result = channelSchema.safeParse({
      id: "canal-http",
      name: "Canal",
      logo_url: "http://example.com/logo.png",
      embeds: [],
    });
    expect(result.success).toBe(false);
  });

  it("aceita canal sem campos opcionais (description/logo_url/category/epg ausentes)", () => {
    const result = channelSchema.safeParse({
      id: "canal-minimo",
      name: "Canal Mínimo",
      embeds: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("embedSchema — validação de URL (PROJECT.md §57/§58)", () => {
  it("aceita embed_url https válido", () => {
    const result = embedSchema.safeParse({
      provider: "Servidor Premium",
      quality: "FULL HD",
      embed_url: "https://embed.example.com/canal",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita embed_url javascript:", () => {
    const result = embedSchema.safeParse({
      provider: "Servidor Premium",
      quality: "FULL HD",
      embed_url: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita embed_url file:", () => {
    const result = embedSchema.safeParse({
      provider: "Servidor Premium",
      quality: "FULL HD",
      embed_url: "file:///etc/passwd",
    });
    expect(result.success).toBe(false);
  });
});
