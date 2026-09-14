-- Fatec Flix — índices
-- PROJECT.md §8–§9

create index if not exists idx_channels_category
on channels(category);

create index if not exists idx_channels_name
on channels(name);

create index if not exists idx_channels_active
on channels(active);

create index if not exists idx_channel_embeds_channel
on channel_embeds(channel_id);

-- Evita duplicação do mesmo provider/url para um canal.
create unique index if not exists idx_channel_embed_unique
on channel_embeds(channel_id, embed_url);
