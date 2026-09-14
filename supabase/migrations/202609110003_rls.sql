-- Fatec Flix — Row Level Security
-- PROJECT.md §15, SECURITY-OWASP-TOP-10-2025.md (deny by default, least privilege)
--
-- channels / channel_embeds / channel_epg: expostas diretamente ao
-- frontend, então RLS habilitado com policy de leitura pública restrita
-- a registros ativos. Nenhuma policy de insert/update/delete para
-- anon/authenticated — escrita só acontece via SUPABASE_SERVICE_ROLE_KEY
-- (services/sync-channels.ts), que ignora RLS.
--
-- sync_logs / app_settings: não são expostas ao frontend. RLS
-- habilitado sem nenhuma policy pública — acesso apenas via service role.

alter table channels enable row level security;
alter table channel_embeds enable row level security;
alter table channel_epg enable row level security;
alter table sync_logs enable row level security;
alter table app_settings enable row level security;

create policy "public read active channels"
on channels
for select
to anon, authenticated
using (active = true);

create policy "public read active channel embeds"
on channel_embeds
for select
to anon, authenticated
using (active = true);

create policy "public read channel epg"
on channel_epg
for select
to anon, authenticated
using (true);

-- sync_logs e app_settings: nenhuma policy criada de propósito.
-- Com RLS habilitado e sem policies, anon/authenticated não têm
-- nenhum acesso (deny by default). Apenas a service role (que
-- ignora RLS) pode ler/escrever essas tabelas.
