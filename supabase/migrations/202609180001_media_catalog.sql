-- Catálogo de filmes e séries (metadados TMDB).
-- A reprodução não é armazenada aqui: URLs de player são resolvidas
-- somente quando o usuário solicita, por providers server-side.

create table if not exists media_titles (
    id bigint generated always as identity primary key,
    media_type text not null
        constraint media_titles_type_check check (media_type in ('movie', 'tv')),
    tmdb_id integer not null constraint media_titles_tmdb_id_check check (tmdb_id > 0),
    imdb_id text,
    title text not null,
    original_title text,
    overview text,
    poster_path text,
    backdrop_path text,
    release_date date,
    vote_average numeric,
    popularity numeric,
    active boolean not null default true,
    metadata jsonb not null default '{}'::jsonb,
    last_synced_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    unique (media_type, tmdb_id)
);

create table if not exists media_seasons (
    id bigint generated always as identity primary key,
    media_id bigint not null references media_titles(id) on delete cascade,
    season_number integer not null constraint media_seasons_number_check check (season_number >= 0),
    name text not null,
    overview text,
    poster_path text,
    episode_count integer not null default 0
        constraint media_seasons_episode_count_check check (episode_count >= 0),
    air_date date,
    updated_at timestamptz not null default now(),
    unique (media_id, season_number)
);

create index if not exists idx_media_titles_active_type_popularity
    on media_titles (media_type, active, popularity desc);
create index if not exists idx_media_titles_title
    on media_titles using gin (to_tsvector('simple', title));

alter table media_titles enable row level security;
alter table media_seasons enable row level security;

create policy "authenticated read active media"
on media_titles for select to authenticated
using (active = true);

create policy "authenticated read media seasons"
on media_seasons for select to authenticated
using (
    exists (
        select 1 from media_titles
        where media_titles.id = media_seasons.media_id
          and media_titles.active = true
    )
);

