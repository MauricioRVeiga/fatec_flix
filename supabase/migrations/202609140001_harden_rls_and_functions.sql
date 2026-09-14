-- Fatec Flix — hardening apontado pelo `supabase db advisors`
--
-- 1) BUG REAL, explorável agora: `channel_epg` tem DUAS policies
--    permissivas de SELECT pra anon/authenticated ao mesmo tempo —
--    `public_read_channel_epg` (using (true), sem filtro nenhum) e
--    "public read channel epg for active channels" (a correta, criada
--    pela migration 006). Policies permissivas no Postgres se
--    combinam com OR, então a policy aberta anula completamente a
--    restrita: qualquer client com a anon key ainda lê via PostgREST
--    a programação de canais inativos, exatamente o que a 006
--    pretendia impedir. A policy `public_read_channel_epg` nunca foi
--    criada por nenhuma migration deste repo (nome em snake_case,
--    diferente do padrão "com espaços" usado em 001-006) — foi
--    aplicada direto no banco (provavelmente via Studio), por isso o
--    linter via mas o `git grep` não. Dropamos por nome, cobrindo os
--    dois nomes possíveis (o desta migration drift e o original da
--    003), pra não depender de qual exatamente está live.
--
-- 2) `try_acquire_sync_lock`/`release_sync_lock` sem `search_path`
--    fixo (`function_search_path_mutable`). Já não são executáveis
--    por anon/authenticated (só service_role, migration 005), então
--    não é explorável hoje — mas fixar o search_path é a prática
--    recomendada e elimina a categoria de risco (schema shadowing) se
--    o grant mudar no futuro.
--
-- 3) `public.rls_auto_enable()` — função de plataforma que o próprio
--    Supabase cria (event trigger que liga RLS em tabelas novas),
--    não faz parte do código deste projeto. Continua com EXECUTE
--    concedido a anon/authenticated, exposta em
--    `/rest/v1/rpc/rls_auto_enable`. Chamá-la fora do contexto de um
--    event trigger falha (usa `pg_event_trigger_ddl_commands()`, só
--    válido dentro de um), então não é explorável — mas não deveria
--    estar alcançável via API pública (least privilege).

-- 1) channel_epg: remove a policy aberta, mantém só a restrita.
drop policy if exists "public_read_channel_epg" on channel_epg;
drop policy if exists "public read channel epg" on channel_epg;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'channel_epg'
      and policyname = 'public read channel epg for active channels'
  ) then
    create policy "public read channel epg for active channels"
    on channel_epg
    for select
    to anon, authenticated
    using (
      exists (
        select 1 from channels c
        where c.id = channel_epg.channel_id
          and c.active = true
      )
    );
  end if;
end $$;

-- 2) search_path fixo nas funções de lock (tabela schema-qualificada
--    porque search_path fica vazio).
create or replace function try_acquire_sync_lock(
    p_sync_type text,
    p_ttl_seconds integer default 300
)
returns boolean
language sql
set search_path = ''
as $$
    with upsert as (
        insert into public.sync_locks as sl (name, locked_at, expires_at)
        values (p_sync_type, now(), now() + make_interval(secs => p_ttl_seconds))
        on conflict (name) do update
            set locked_at = excluded.locked_at,
                expires_at = excluded.expires_at
            where sl.expires_at < now()
        returning true as acquired
    )
    select coalesce((select acquired from upsert), false);
$$;

create or replace function release_sync_lock(p_sync_type text)
returns boolean
language sql
set search_path = ''
as $$
    with deleted as (
        delete from public.sync_locks where name = p_sync_type
        returning true as released
    )
    select coalesce((select released from deleted), false);
$$;

revoke all on function try_acquire_sync_lock(text, integer) from public;
revoke all on function release_sync_lock(text) from public;
grant execute on function try_acquire_sync_lock(text, integer) to service_role;
grant execute on function release_sync_lock(text) to service_role;

-- 3) rls_auto_enable: tira do alcance de anon/authenticated via API.
--    Função de plataforma (não versionada em migrations deste
--    projeto) — só revogamos o grant, não alteramos a definição.
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
