import { describe, expect, it } from "vitest";

import { channelSchema } from "@/lib/upstream/schemas";
import { normalizeUpstreamChannel } from "@/lib/upstream/normalizer";

import fixturesRaw from "../fixtures/channels.json";

const fixtures = fixturesRaw.data.map((raw) => channelSchema.parse(raw));

const SYNC_STARTED_AT = new Date("2030-06-15T12:00:00Z");

describe("normalizeUpstreamChannel", () => {
  it("converte start_time/end_time (Unix, segundos) para timestamptz ISO (PROJECT.md §10)", () => {
    const channel = fixtures.find((c) => c.id === "canal-com-epg")!;
    const { epg } = normalizeUpstreamChannel(channel, SYNC_STARTED_AT);

    expect(epg).not.toBeNull();
    expect(epg!.current_start_time).toBe(
      new Date(channel.epg!.current!.start_time * 1000).toISOString()
    );
    expect(epg!.current_end_time).toBe(
      new Date(channel.epg!.current!.end_time * 1000).toISOString()
    );
  });

  it("canal sem EPG vira epg: null explicitamente (PROJECT.md §41)", () => {
    const channel = fixtures.find((c) => c.id === "canal-sem-epg")!;
    const { epg } = normalizeUpstreamChannel(channel, SYNC_STARTED_AT);

    expect(epg).toBeNull();
  });

  it("canal com epg.current e epg.next preenche as duas colunas", () => {
    const channel = fixtures.find((c) => c.id === "canal-com-epg")!;
    const { epg } = normalizeUpstreamChannel(channel, SYNC_STARTED_AT);

    expect(epg!.current_title).toBe("Documentário Atual");
    expect(epg!.next_title).toBe("Próximo Documentário");
  });

  it("não grava um timestamp de geração do upstream que não existe (upstream_timestamp: null)", () => {
    const channel = fixtures.find((c) => c.id === "canal-com-epg")!;
    const { epg } = normalizeUpstreamChannel(channel, SYNC_STARTED_AT);

    expect(epg!.upstream_timestamp).toBeNull();
  });

  it("um embed vira uma linha de channel_embeds com position 0", () => {
    const channel = fixtures.find((c) => c.id === "canal-um-embed")!;
    const { embeds } = normalizeUpstreamChannel(channel, SYNC_STARTED_AT);

    expect(embeds).toHaveLength(1);
    expect(embeds[0].position).toBe(0);
    expect(embeds[0].embed_url).toBe(channel.embeds[0].embed_url);
  });

  it("dois embeds preservam a ordem via position (PROJECT.md §37 seleção de servidor)", () => {
    const channel = fixtures.find((c) => c.id === "canal-dois-embeds")!;
    const { embeds } = normalizeUpstreamChannel(channel, SYNC_STARTED_AT);

    expect(embeds).toHaveLength(2);
    expect(embeds[0].position).toBe(0);
    expect(embeds[1].position).toBe(1);
    expect(embeds[0].provider).toBe("Servidor Premium");
    expect(embeds[1].provider).toBe("Servidor Alternativo");
  });

  it("logo_url ausente vira null, não quebra a normalização", () => {
    const channel = fixtures.find((c) => c.id === "canal-sem-imagem")!;
    const { channel: normalized } = normalizeUpstreamChannel(channel, SYNC_STARTED_AT);

    expect(normalized.logo_url).toBeNull();
  });

  it("description ausente vira null", () => {
    const channel = fixtures.find((c) => c.id === "canal-sem-descricao")!;
    const { channel: normalized } = normalizeUpstreamChannel(channel, SYNC_STARTED_AT);

    expect(normalized.description).toBeNull();
  });

  it("todo canal normalizado entra como active: true e last_seen_at/updated_at = início da sync", () => {
    const channel = fixtures[0];
    const { channel: normalized } = normalizeUpstreamChannel(channel, SYNC_STARTED_AT);

    expect(normalized.active).toBe(true);
    expect(normalized.last_seen_at).toBe(SYNC_STARTED_AT.toISOString());
    expect(normalized.updated_at).toBe(SYNC_STARTED_AT.toISOString());
  });
});
