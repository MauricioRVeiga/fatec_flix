-- Fatec Flix — remove funcoes orfas encontradas no banco live
--
-- Ao conferir se restava mais drift alem do achado em
-- 202609140001 (a policy solta de channel_epg), apareceram DUAS
-- funcoes que nenhuma migration deste repo jamais criou:
--
--   try_acquire_sync_lock(lock_key bigint)  -- SECURITY DEFINER, search_path=public
--   release_sync_lock(lock_key bigint)      -- SECURITY DEFINER, search_path=public
--
-- Assinatura (bigint) diferente da nossa (text / text+integer,
-- 202609110004 e 202609110005) — overload por tipo de argumento no
-- Postgres, entao coexistiam sem conflito. Origem desconhecida
-- (provavelmente SQL manual de alguma tentativa anterior, mesmo
-- padrao do achado em channel_epg) — nao aparecem em nenhum
-- supabase/migrations/*.sql.
--
-- Risco pratico baixo (EXECUTE restrito a postgres/service_role, sem
-- grant para anon/authenticated, e nosso codigo so chama via
-- client.rpc("try_acquire_sync_lock", { p_sync_type }) — o nome do
-- parametro so bate com a versao text, nunca resolveria pra essa aqui
-- por acidente) — mas SECURITY DEFINER + search_path mutavel (nao
-- fixo em '') é exatamente a categoria de risco que ja corrigimos na
-- nossa propria versao em 202609140001. Sem uso nenhum no projeto:
-- remove.

drop function if exists try_acquire_sync_lock(bigint);
drop function if exists release_sync_lock(bigint);
