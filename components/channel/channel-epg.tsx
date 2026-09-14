import { calculateProgress, formatTime, isLiveNow } from "@/lib/epg";
import type { ApiEpg } from "@/lib/api/serialize-channel";

export function ChannelEpg({ epg }: { epg: ApiEpg | null }) {
  const current = epg?.current ?? null;
  const next = epg?.next ?? null;

  if (!current && !next) {
    return <p className="text-sm text-muted-foreground">Programação não disponível.</p>;
  }

  const progress = calculateProgress(current);
  const live = isLiveNow(current);

  return (
    <div className="flex flex-col gap-4">
      {current && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Agora
            </p>
            {live && (
              <span className="flex items-center gap-1 text-xs font-medium text-live">
                <span className="size-1.5 animate-pulse rounded-full bg-live" aria-hidden="true" />
                AO VIVO
              </span>
            )}
          </div>
          <p className="font-medium">{current.title}</p>
          <p className="text-sm text-muted-foreground">
            {formatTime(current.start_time)} — {formatTime(current.end_time)}
          </p>
          {current.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{current.description}</p>
          )}
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Progresso do programa atual"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {next && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Próximo
          </p>
          <p className="font-medium">{next.title}</p>
          <p className="text-sm text-muted-foreground">
            {formatTime(next.start_time)} — {formatTime(next.end_time)}
          </p>
        </div>
      )}
    </div>
  );
}
