/**
 * Cálculos de EPG (PROJECT.md §34, §35, §67). Funções puras — fáceis
 * de testar isoladamente, sem depender de banco/rede.
 */

export interface EpgWindow {
  start_time: string;
  end_time: string;
}

/**
 * "AO VIVO" é calculado pelo timestamp, nunca confiando apenas no
 * texto vindo do upstream (PROJECT.md §34).
 */
export function isLiveNow(program: EpgWindow | null | undefined, now: Date = new Date()): boolean {
  if (!program) {
    return false;
  }

  const start = new Date(program.start_time).getTime();
  const end = new Date(program.end_time).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return false;
  }

  return start <= now.getTime() && now.getTime() < end;
}

/** Progresso do programa atual, sempre entre 0 e 1 (PROJECT.md §35). */
export function calculateProgress(
  program: EpgWindow | null | undefined,
  now: Date = new Date()
): number {
  if (!program) {
    return 0;
  }

  const start = new Date(program.start_time).getTime();
  const end = new Date(program.end_time).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }

  const progress = (now.getTime() - start) / (end - start);

  return Math.min(1, Math.max(0, progress));
}

/** Formata um horário para exibição curta (ex.: "15:00"), fuso do servidor. */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
