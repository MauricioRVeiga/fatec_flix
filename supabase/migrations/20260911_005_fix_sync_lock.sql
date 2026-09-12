-- Fatec Flix — corrige o lock de sincronização (PROJECT.md §26)
--
-- BUG REAL na migration 20260911_004: pg_try_advisory_lock/
-- pg_advisory_unlock são *por sessão* do Postgres. services/sync-channels.ts
-- chama try_acquire_sync_lock e release_sync_lock como duas requisições
-- .rpc() separadas via @supabase/supabase-js, que fala com o Postgres
-- através do PostgREST/pooler (conexões sem estado, sem afinidade de
-- sessão garantida entre requisições). Isso significa:
--   - o release pode rodar numa sessão diferente da que fez o acquire,
--     e pg_advisory_unlock simplesmente falha silenciosamente
--     (retorna false) sem soltar o lock de verdade — trava
--     sincronizações futuras indefinidamente ("status: skipped" pra
--     sempre);
--   - ou, dependendo do modo do pooler, o lock nem chega a bloquear
--     uma segunda sincronização concorrente de verdade.
-- Ou seja: a garantia de exclusão mútua do §26 não era cumprida.
--
-- Correção: trocar o lock de sessão do Postgres por um lock baseado
-- em linha de tabela com expiração (TTL). Isso funciona
-- independentemente de qual conexão do pool atende cada requisição,
-- porque é só dado comum protegido pela constraint de unicidade —
-- nenhuma sessão especial é necessária pra "segurar" o lock. O TTL
-- evita deadlock permanente caso uma sincronização trave/derrube sem
-- liberar o lock.

drop function if exists try_acquire_sync_lock(text);
drop function if exists release_sync_lock(text);

create table if not exists sync_locks (
    name text primary key,
    locked_at timestamptz not null,
    expires_at timestamptz not null
);

alter table sync_locks enable row level security;
-- Sem policies públicas de propósito — mesmo padrão de sync_logs/
-- app_settings (migration 003): só a service role acessa.

create or replace function try_acquire_sync_lock(
    p_sync_type text,
    p_ttl_seconds integer default 300
)
returns boolean
language sql
as $$
    with upsert as (
        insert into sync_locks as sl (name, locked_at, expires_at)
        values (p_sync_type, now(), now() + make_interval(secs => p_ttl_seconds))
        on conflict (name) do update
            set locked_at = now(),
                expires_at = now() + make_interval(secs => p_ttl_seconds)
            -- só "rouba" o lock se o anterior já expirou (TTL) —
            -- caso contrário, o conflito não atualiza nada e nenhuma
            -- linha é retornada por RETURNING abaixo.
            where sl.expires_at < now()
        returning true as acquired
    )
    select coalesce((select acquired from upsert), false);
$$;

create or replace function release_sync_lock(p_sync_type text)
returns boolean
language sql
as $$
    with deleted as (
        delete from sync_locks where name = p_sync_type
        returning true as released
    )
    select coalesce((select released from deleted), false);
$$;

revoke all on table sync_locks from public;
revoke all on function try_acquire_sync_lock(text, integer) from public;
revoke all on function release_sync_lock(text) from public;

grant execute on function try_acquire_sync_lock(text, integer) to service_role;
grant execute on function release_sync_lock(text) to service_role;
