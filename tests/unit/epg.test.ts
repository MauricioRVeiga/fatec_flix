import { describe, expect, it } from "vitest";

import { calculateProgress, formatTime, isLiveNow } from "@/lib/epg";

describe("isLiveNow", () => {
  it("retorna false quando não há programa", () => {
    expect(isLiveNow(null)).toBe(false);
    expect(isLiveNow(undefined)).toBe(false);
  });

  it("retorna true quando agora está dentro da janela do programa", () => {
    const now = new Date("2030-01-01T12:00:00Z");
    const program = {
      start_time: "2030-01-01T11:00:00Z",
      end_time: "2030-01-01T13:00:00Z",
    };

    expect(isLiveNow(program, now)).toBe(true);
  });

  it("retorna false antes do início", () => {
    const now = new Date("2030-01-01T10:00:00Z");
    const program = {
      start_time: "2030-01-01T11:00:00Z",
      end_time: "2030-01-01T13:00:00Z",
    };

    expect(isLiveNow(program, now)).toBe(false);
  });

  it("retorna false exatamente no fim (end é exclusivo)", () => {
    const now = new Date("2030-01-01T13:00:00Z");
    const program = {
      start_time: "2030-01-01T11:00:00Z",
      end_time: "2030-01-01T13:00:00Z",
    };

    expect(isLiveNow(program, now)).toBe(false);
  });

  it("retorna true exatamente no início (start é inclusivo)", () => {
    const now = new Date("2030-01-01T11:00:00Z");
    const program = {
      start_time: "2030-01-01T11:00:00Z",
      end_time: "2030-01-01T13:00:00Z",
    };

    expect(isLiveNow(program, now)).toBe(true);
  });

  it("nunca confia só no texto — mesmo com formatted_time otimista, calcula pelo timestamp", () => {
    const now = new Date("2030-01-01T20:00:00Z");
    const program = {
      start_time: "2030-01-01T11:00:00Z",
      end_time: "2030-01-01T13:00:00Z",
    };

    expect(isLiveNow(program, now)).toBe(false);
  });

  it("retorna false para timestamps inválidos", () => {
    const now = new Date("2030-01-01T12:00:00Z");
    expect(isLiveNow({ start_time: "not-a-date", end_time: "2030-01-01T13:00:00Z" }, now)).toBe(
      false
    );
  });
});

describe("calculateProgress", () => {
  it("retorna 0 quando não há programa", () => {
    expect(calculateProgress(null)).toBe(0);
  });

  it("calcula a fração correta no meio do programa", () => {
    const now = new Date("2030-01-01T12:00:00Z");
    const program = {
      start_time: "2030-01-01T11:00:00Z",
      end_time: "2030-01-01T13:00:00Z",
    };

    expect(calculateProgress(program, now)).toBeCloseTo(0.5);
  });

  it("nunca fica abaixo de 0 (programa ainda não começou)", () => {
    const now = new Date("2030-01-01T09:00:00Z");
    const program = {
      start_time: "2030-01-01T11:00:00Z",
      end_time: "2030-01-01T13:00:00Z",
    };

    expect(calculateProgress(program, now)).toBe(0);
  });

  it("nunca passa de 1 (programa já devia ter acabado)", () => {
    const now = new Date("2030-01-01T23:00:00Z");
    const program = {
      start_time: "2030-01-01T11:00:00Z",
      end_time: "2030-01-01T13:00:00Z",
    };

    expect(calculateProgress(program, now)).toBe(1);
  });

  it("retorna 0 se end <= start (dado inconsistente)", () => {
    const now = new Date("2030-01-01T12:00:00Z");
    const program = {
      start_time: "2030-01-01T13:00:00Z",
      end_time: "2030-01-01T11:00:00Z",
    };

    expect(calculateProgress(program, now)).toBe(0);
  });
});

describe("formatTime", () => {
  it("formata um ISO string válido", () => {
    expect(formatTime("2030-01-01T12:34:00Z")).toMatch(/^\d{2}:\d{2}$/);
  });

  it("retorna placeholder para data inválida", () => {
    expect(formatTime("not-a-date")).toBe("--:--");
  });
});
