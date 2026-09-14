import { Badge } from "@/components/ui/badge";
import { getAdminDashboardData } from "@/lib/api/get-admin-dashboard";
import type { SyncLogRow, SyncStatus } from "@/types/database";

import { ForceSyncButton } from "./force-sync-button";

export const dynamic = "force-dynamic";

const SYNC_STATUS_LABEL: Record<SyncStatus, string> = {
  running: "Rodando",
  success: "Sucesso",
  partial: "Parcial",
  failed: "Falhou",
};

function statusVariant(status: SyncStatus | "healthy" | "degraded" | "unavailable") {
  if (status === "healthy" || status === "success") return "outline" as const;
  if (status === "failed" || status === "unavailable") return "destructive" as const;
  return "secondary" as const;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "—";
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminDashboardPage() {
  const {
    upstreamHealth,
    latestSync,
    recentSyncLogs,
    activeChannels,
    inactiveChannels,
    providerCounts,
  } = await getAdminDashboardData();

  const recentErrors = recentSyncLogs.filter((log) => log.status === "failed");
  const providerEntries = Object.entries(providerCounts).sort(([, a], [, b]) => b - a);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Canais ativos" value={activeChannels} />
        <StatCard label="Canais inativos" value={inactiveChannels} />
        <StatCard
          label="Status upstream"
          value={<Badge variant={statusVariant(upstreamHealth.status)}>{upstreamHealth.status}</Badge>}
        />
        <StatCard
          label="Última sincronização"
          value={
            latestSync ? (
              <Badge variant={statusVariant(latestSync.status)}>
                {SYNC_STATUS_LABEL[latestSync.status]}
              </Badge>
            ) : (
              "—"
            )
          }
        />
      </div>

      <Section title="Última sincronização">
        {latestSync ? (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Iniciada em</dt>
              <dd>{formatDateTime(latestSync.started_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Duração</dt>
              <dd>{formatDuration(latestSync.started_at, latestSync.finished_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Recebidos / criados / atualizados</dt>
              <dd>
                {latestSync.records_received} / {latestSync.records_created} /{" "}
                {latestSync.records_updated}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Falhas</dt>
              <dd>{latestSync.records_failed}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma sincronização registrada ainda.</p>
        )}

        <ForceSyncButton />
      </Section>

      <Section title="Erros recentes">
        {recentErrors.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum erro nas últimas execuções.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {recentErrors.map((log: SyncLogRow) => (
              <li key={log.id} className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-xs text-muted-foreground">{formatDateTime(log.started_at)}</p>
                <p className="text-destructive">{log.error_message ?? "Erro sem mensagem."}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Providers (embeds ativos)">
        {providerEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum embed ativo.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {providerEntries.map(([provider, count]) => (
              <li key={provider}>
                <Badge variant="outline">
                  {provider}: {count}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
