-- Fatec Flix — lock de concorrência para sincronizações
-- PROJECT.md §26: impedir duas sincronizações simultâneas usando
-- PostgreSQL advisory lock.
--
-- O lock é identificado pelo próprio `sync_type` (hashtext), então
-- sincronizações de tipos diferentes (ex.: "channels" no futuro vs.
-- um "epg" dedicado) não bloqueiam uma à outra.
--
-- Acesso restrito à service role: um usuário anon/authenticated não
-- deve conseguir travar ou destravar a sincronização (least privilege).

create or replace function try_acquire_sync_lock(p_sync_type text)
returns boolean
language sql
as $$
  select pg_try_advisory_lock(hashtext(p_sync_type)::bigint);
$$;

create or replace function release_sync_lock(p_sync_type text)
returns boolean
language sql
as $$
  select pg_advisory_unlock(hashtext(p_sync_type)::bigint);
$$;

revoke all on function try_acquire_sync_lock(text) from public;
revoke all on function release_sync_lock(text) from public;

grant execute on function try_acquire_sync_lock(text) to service_role;
grant execute on function release_sync_lock(text) to service_role;
