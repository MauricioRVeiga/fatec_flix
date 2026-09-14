export interface EpgWindow {
  start_time: string;
  end_time: string;
}

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

export function formatTime(isoString: string): string {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
