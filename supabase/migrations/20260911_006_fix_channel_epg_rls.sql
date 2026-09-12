-- Fatec Flix — corrige RLS de channel_epg (PROJECT.md §15)
--
-- BUG REAL na migration 20260911_003: a policy pública de
-- channel_epg usava `using (true)`, sem filtrar por canal ativo —
-- diferente de channels/channel_embeds, que já restringiam a
-- `active = true`. channel_epg não tem coluna `active` própria (é
-- 1:1 com o canal) e services/sync-channels.ts nunca apaga o EPG de
-- um canal só porque ele foi marcado inativo (markStaleInactive) —
-- só apaga quando o upstream para de mandar EPG para aquele canal
-- especificamente. Resultado: qualquer cliente com a anon key
-- (pública, vai pro browser) conseguia ler via PostgREST a
-- programação de canais que a aplicação já esconde em toda a UI/API
-- interna (que sempre filtra por active = true).

drop policy if exists "public read channel epg" on channel_epg;

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
