-- Fatec Flix — schema inicial
-- PROJECT.md §8–§12

create table if not exists channels (
    id text primary key,

    name text not null,
    description text,
    logo_url text,
    category text,

    active boolean not null default true,

    upstream_created_at timestamptz,
    last_seen_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create table if not exists channel_embeds (
    id bigint generated always as identity primary key,

    channel_id text not null
        references channels(id)
        on delete cascade,

    provider text not null,
    quality text,
    embed_url text not null,

    position integer not null default 0,

    active boolean not null default true,

    last_seen_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create table if not exists channel_epg (
    channel_id text primary key
        references channels(id)
        on delete cascade,

    current_title text,
    current_description text,
    current_formatted_time text,
    current_start_time timestamptz,
    current_end_time timestamptz,
    current_image text,

    next_title text,
    next_description text,
    next_formatted_time text,
    next_start_time timestamptz,
    next_end_time timestamptz,
    next_image text,

    upstream_timestamp bigint,

    synced_at timestamptz not null default now()
);

create table if not exists sync_logs (
    id bigint generated always as identity primary key,

    sync_type text not null,

    status text not null
        constraint sync_logs_status_check
        check (status in ('running', 'success', 'partial', 'failed')),

    started_at timestamptz not null,
    finished_at timestamptz,

    records_received integer default 0,
    records_created integer default 0,
    records_updated integer default 0,
    records_failed integer default 0,

    upstream_status integer,

    error_message text,

    metadata jsonb,

    created_at timestamptz not null default now()
);

create table if not exists app_settings (
    key text primary key,
    value jsonb not null,
    updated_at timestamptz not null default now()
);
