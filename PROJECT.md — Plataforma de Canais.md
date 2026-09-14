# PROJECT.md — Plataforma Web de Canais e Programação

## 1. Visão geral

Desenvolva uma aplicação web moderna para catálogo de canais de televisão, programação atual/próxima, categorias, busca e visualização de canais.

O projeto será hospedado na **Vercel** e utilizará **Supabase/PostgreSQL** como banco de dados.

A aplicação utilizará como fonte externa a API:

```text
https://api.reidoscanais.st
```

A API externa deve ser tratada como uma **fonte de dados upstream**, nunca como banco principal da aplicação.

A aplicação deve sincronizar os dados da API para o Supabase e servir o frontend principalmente através do nosso próprio backend/banco.

Arquitetura desejada:

```text
Rei dos Canais API
        │
        ▼
Next.js Server / Sync Service
        │
        ▼
Supabase PostgreSQL
        │
        ▼
Next.js
        │
        ▼
Vercel
        │
        ▼
Usuário
```

---

# 2. Objetivos

Construir uma aplicação que permita:

- listar canais;
- visualizar canais por categoria;
- pesquisar canais;
- visualizar logo e descrição;
- mostrar programa atual;
- mostrar próximo programa;
- mostrar horário da programação;
- mostrar imagem do programa quando disponível;
- permitir múltiplos providers/servidores por canal;
- indicar qualidade do provider;
- possuir página individual para cada canal;
- possuir favoritos;
- ter interface responsiva;
- possuir modo escuro;
- funcionar bem em desktop, tablet e celular;
- continuar funcionando caso a API externa fique temporariamente indisponível;
- sincronizar periodicamente os dados externos;
- possuir painel/endpoint de saúde da aplicação;
- possuir estrutura preparada para expansão futura.

---

# 3. Regras importantes

## 3.1 API externa

Não chamar diretamente:

```text
https://api.reidoscanais.st
```

pelo browser sempre que um usuário acessar a aplicação.

A integração deve acontecer preferencialmente no servidor.

Fluxo correto:

```text
API externa
    ↓
backend Next.js
    ↓
Supabase
    ↓
frontend
```

O Supabase deve funcionar como:

- armazenamento;
- cache persistente;
- fallback quando upstream estiver offline;
- fonte rápida para o frontend.

---

## 3.2 Conteúdo externo

Não fazer:

- download de streams;
- proxy de vídeo;
- retransmissão de vídeo;
- armazenamento de vídeo;
- gravação dos canais;
- extração de URLs HLS;
- extração de `.m3u8`;
- engenharia reversa dos players;
- bypass de autenticação;
- bypass de DRM;
- bypass de controles de acesso.

Os campos `embed_url` devem ser tratados exclusivamente como **URLs externas fornecidas pela API**.

A aplicação deve permitir desabilitar completamente a renderização de embeds através de uma variável:

```env
NEXT_PUBLIC_ENABLE_EXTERNAL_EMBEDS=false
```

Somente habilitar os embeds quando houver autorização para utilização do conteúdo correspondente.

---

# 4. Stack tecnológica

Utilizar versões estáveis atuais.

## Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Lucide Icons
```

Utilizar:

```text
Next.js App Router
```

Não utilizar Pages Router.

---

## Backend

O próprio Next.js será utilizado como backend através de:

```text
Route Handlers
Server Components
Server Actions quando fizer sentido
```

---

## Banco

```text
Supabase
PostgreSQL
```

Biblioteca:

```text
@supabase/supabase-js
```

Utilizar migrations SQL versionadas dentro do projeto.

---

## Validação

Utilizar:

```text
Zod
```

para validar respostas provenientes da API upstream.

Nunca assumir que o JSON remoto sempre terá o mesmo formato.

---

# 5. Estrutura da API externa

A resposta de canais observada possui estrutura semelhante a:

```typescript
interface UpstreamResponse {
  success: boolean
  data: Channel[]
  total: number
}
```

Exemplo de canal:

```typescript
interface Channel {
  id: string
  name: string
  description?: string
  logo_url?: string
  category?: string

  embeds: ChannelEmbed[]

  epg?: {
    current?: EpgProgram
    next?: EpgProgram
  }
}
```

Provider:

```typescript
interface ChannelEmbed {
  provider: string
  quality: string
  embed_url: string
}
```

Programa:

```typescript
interface EpgProgram {
  title: string
  description?: string
  formatted_time?: string
  start_time: number
  end_time: number
  image?: string
}
```

Não considerar:

```typescript
embeds[0]
```

como único provider disponível.

Um canal pode possuir:

```text
Servidor Premium
Servidor Alternativo
outros providers futuros
```

Portanto a arquitetura obrigatoriamente deve suportar relação:

```text
channel
   1
   │
   N
channel_embeds
```

---

# 6. Exemplo real de dados

A API pode retornar:

```json
{
  "id": "adultswim",
  "name": "Adult Swim",
  "description": "...",
  "logo_url": "https://cdn.reidoscanais.st/imagens/adultswim.png",
  "category": "Entretenimento",
  "embeds": [
    {
      "provider": "Servidor Premium",
      "quality": "FULL HD",
      "embed_url": "https://rdcanais.net/adultswim"
    }
  ],
  "epg": {
    "current": {
      "title": "My Hero Academia",
      "description": "...",
      "formatted_time": "...",
      "start_time": 1788285780,
      "end_time": 1788287220,
      "image": "..."
    },
    "next": {
      "title": "Justiça Jovem",
      "description": "...",
      "formatted_time": "...",
      "start_time": 1788287220,
      "end_time": 1788288720,
      "image": "..."
    }
  }
}
```

Há canais que não possuem EPG.

Há canais que possuem múltiplos embeds.

Toda a implementação precisa considerar campos opcionais.

---

# 7. Problemas de encoding

Durante testes via PowerShell foram observados textos exibidos incorretamente, como:

```text
Not├¡cias
Programa├º├úo
Televis├úo
```

Isso provavelmente é resultado da interpretação incorreta de UTF-8 pelo terminal e não necessariamente do JSON original.

O sistema deve:

1. trabalhar internamente com UTF-8;
2. preservar corretamente caracteres portugueses;
3. não realizar correções destrutivas automaticamente;
4. validar o `Content-Type` retornado;
5. armazenar strings Unicode normalmente no PostgreSQL.

Não criar substituições manuais como:

```typescript
text.replace(...)
```

sem verificar primeiro se o problema realmente existe na resposta HTTP original.

---

# 8. Banco de dados

Criar as seguintes tabelas.

---

## 8.1 channels

```sql
create table channels (
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
```

Criar índices:

```sql
create index idx_channels_category
on channels(category);

create index idx_channels_name
on channels(name);

create index idx_channels_active
on channels(active);
```

---

# 9. Tabela de embeds

```sql
create table channel_embeds (
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
```

Criar índice:

```sql
create index idx_channel_embeds_channel
on channel_embeds(channel_id);
```

Criar constraint ou índice unique adequado para evitar duplicação do mesmo provider/url.

Exemplo:

```sql
create unique index idx_channel_embed_unique
on channel_embeds(channel_id, embed_url);
```

---

# 10. EPG

Como o upstream disponibiliza principalmente:

```text
current
next
```

criar inicialmente uma tabela de snapshot.

```sql
create table channel_epg (
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
```

Converter Unix timestamp da API:

```text
start_time
end_time
```

para `timestamptz`.

Não armazenar somente a string `formatted_time`.

A string deve ser apenas informativa.

A fonte temporal real deve ser:

```text
start_time
end_time
```

---

# 11. Histórico de sincronizações

Criar:

```sql
create table sync_logs (
    id bigint generated always as identity primary key,

    sync_type text not null,

    status text not null,

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
```

Valores possíveis:

```text
running
success
partial
failed
```

---

# 12. Configurações da aplicação

Criar opcionalmente:

```sql
create table app_settings (
    key text primary key,
    value jsonb not null,
    updated_at timestamptz not null default now()
);
```

Exemplos:

```text
sync_enabled
sync_interval
external_embeds_enabled
maintenance_mode
```

---

# 13. Favoritos

Na primeira versão pode utilizar `localStorage`.

Criar abstração:

```typescript
useFavorites()
```

permitindo futuramente mover favoritos para Supabase Auth.

Exemplo:

```typescript
interface FavoritesStore {
  favorites: string[]

  add(channelId: string): void
  remove(channelId: string): void
  toggle(channelId: string): void
  isFavorite(channelId: string): boolean
}
```

---

# 14. Supabase Auth

Não implementar obrigatoriamente na primeira versão.

A arquitetura deve, entretanto, permitir futuramente:

```text
login
favoritos sincronizados
histórico
preferências
perfis
```

---

# 15. Row Level Security

Habilitar RLS nas tabelas que forem expostas diretamente ao frontend.

Não disponibilizar:

```env
SUPABASE_SERVICE_ROLE_KEY
```

para o browser.

A Service Role deve existir exclusivamente no servidor.

Estrutura:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=
```

O frontend nunca poderá receber:

```text
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
```

---

# 16. Cliente da API upstream

Criar:

```text
src/lib/upstream/
```

Estrutura:

```text
src/lib/upstream/
├── client.ts
├── schemas.ts
├── types.ts
├── channels.ts
├── health.ts
└── errors.ts
```

---

# 17. Configuração da API

```env
UPSTREAM_API_URL=https://api.reidoscanais.st
```

Não espalhar essa URL pelo código.

Criar:

```typescript
const UPSTREAM_API_URL =
  process.env.UPSTREAM_API_URL
```

---

# 18. Fetch da API

Criar função:

```typescript
async function upstreamFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T>
```

Ela deve implementar:

- timeout;
- tratamento de status HTTP;
- validação JSON;
- tratamento de JSON inválido;
- logs;
- User-Agent da aplicação;
- retries controlados;
- backoff;
- Zod.

Timeout sugerido:

```text
8 segundos
```

Retry:

```text
máximo 2 tentativas adicionais
```

Não fazer retry indiscriminado em erros `4xx`.

---

# 19. Validação Zod

Criar schemas semelhantes a:

```typescript
const embedSchema = z.object({
  provider: z.string(),
  quality: z.string().optional().nullable(),
  embed_url: z.string().url()
})

const epgProgramSchema = z.object({
  title: z.string(),
  description: z.string().optional().nullable(),
  formatted_time: z.string().optional().nullable(),
  start_time: z.number(),
  end_time: z.number(),
  image: z.string().url().optional().nullable()
})

const channelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
  category: z.string().optional().nullable(),

  embeds: z.array(embedSchema).default([]),

  epg: z.object({
    current: epgProgramSchema.optional().nullable(),
    next: epgProgramSchema.optional().nullable()
  }).optional().nullable()
})
```

O sistema não deve quebrar toda a sincronização porque um único canal veio com campo inválido.

Processar registros individualmente quando necessário.

---

# 20. Serviço de sincronização

Criar:

```text
src/services/sync-channels.ts
```

Responsabilidade:

```text
GET upstream
       ↓
validar
       ↓
normalizar
       ↓
upsert channels
       ↓
upsert embeds
       ↓
upsert EPG
       ↓
registrar sync_logs
```

---

# 21. Estratégia de upsert

Para cada canal:

```text
channels.id = upstream.id
```

Executar:

```text
UPSERT
```

Atualizar:

```text
name
description
logo_url
category
last_seen_at
updated_at
```

---

# 22. Canais removidos

Não deletar imediatamente canais que desaparecerem da API.

Utilizar:

```text
last_seen_at
active
```

No início da sincronização:

```text
sync_started_at = now()
```

Depois do processamento, canais cujo:

```text
last_seen_at < sync_started_at
```

podem ser marcados:

```text
active = false
```

Não apagar histórico automaticamente.

---

# 23. Sincronização de embeds

A mesma lógica deve existir para providers.

Se determinado embed desaparecer:

```text
active = false
```

Não deletar imediatamente.

---

# 24. Cron

Criar endpoint protegido:

```text
GET /api/cron/sync-channels
```

ou:

```text
POST /api/cron/sync-channels
```

Validar segredo.

```env
CRON_SECRET=
```

Exemplo de autenticação:

```text
Authorization: Bearer CRON_SECRET
```

Rejeitar chamadas sem autenticação.

---

# 25. Frequência de atualização

Separar catálogo e EPG futuramente.

Inicialmente executar sincronização a cada:

```text
5 minutos
```

caso o plano/infraestrutura de cron utilizado permita essa frequência.

Se houver limitações da Vercel, deixar o cron configurável.

Não codificar intervalo dentro da aplicação.

---

# 26. Concorrência

Impedir duas sincronizações simultâneas.

Pode utilizar:

```text
PostgreSQL advisory lock
```

ou mecanismo equivalente.

Objetivo:

```text
cron A
cron B
```

não podem atualizar as mesmas tabelas simultaneamente.

---

# 27. Health check upstream

A API possui:

```text
GET /health
```

Criar:

```typescript
getUpstreamHealth()
```

O upstream pode retornar algo semelhante a:

```json
{
  "success": true,
  "status": "degraded",
  "checks": {
    "database": true,
    "epg_cache": false,
    "cache_writable": true
  }
}
```

Portanto:

```text
success=true
```

não significa necessariamente:

```text
status=healthy
```

Tratar separadamente:

```text
healthy
degraded
unavailable
```

---

# 28. Nossa API

Criar uma API interna estável.

Não fazer o frontend depender diretamente do schema da API externa.

---

## GET /api/channels

Suportar:

```text
/api/channels
/api/channels?category=Esportes
/api/channels?q=globo
/api/channels?page=1
/api/channels?limit=24
```

Resposta:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 24,
    "total": 110,
    "pages": 5
  }
}
```

---

## GET /api/channels/[id]

Retornar:

```json
{
  "channel": {},
  "embeds": [],
  "epg": {}
}
```

---

## GET /api/categories

Retornar categorias existentes no nosso banco.

Exemplo:

```json
[
  {
    "name": "Esportes",
    "count": 20
  },
  {
    "name": "Entretenimento",
    "count": 35
  }
]
```

---

## GET /api/health

Retornar:

```json
{
  "status": "healthy",
  "database": true,
  "upstream": {
    "status": "degraded"
  },
  "lastSync": "...",
  "channels": 110
}
```

Não expor:

- segredos;
- connection strings;
- stack traces;
- service role;
- informações internas sensíveis.

---

# 29. Frontend

Criar interface moderna com visual inspirado em plataformas de streaming, mas sem copiar identidade visual de terceiros.

---

# 30. Layout

Desktop:

```text
┌───────────────────────────────────────────────┐
│ Logo       Busca          Favoritos   Tema   │
├───────────────────────────────────────────────┤
│                                               │
│ Destaques / Ao vivo agora                    │
│                                               │
├───────────────────────────────────────────────┤
│ Categorias                                    │
├───────────────────────────────────────────────┤
│                                               │
│ Grid de canais                               │
│                                               │
└───────────────────────────────────────────────┘
```

---

# 31. Header

Criar:

```text
Logo
Busca
Favoritos
Alternar tema
```

Header:

```text
sticky
backdrop blur
responsivo
```

---

# 32. Página inicial

Rota:

```text
/
```

Seções:

```text
Em destaque
Agora na TV
Canais abertos
Esportes
Notícias
Filmes e Séries
Infantil
Entretenimento
Documentários
Todos os canais
```

Somente renderizar uma seção se houver canais nela.

---

# 33. Card do canal

Cada card deve mostrar:

```text
logo
nome
categoria
programa atual
horário
qualidade disponível
favorito
```

Exemplo visual:

```text
┌───────────────────────────┐
│                           │
│         LOGO              │
│                           │
├───────────────────────────┤
│ CNN Brasil                │
│ Notícias                  │
│                           │
│ CNN 360º                  │
│ 15:00 → 17:55             │
│                           │
│ ● AO VIVO          ♥      │
└───────────────────────────┘
```

---

# 34. Indicador "AO VIVO"

Calcular pelo timestamp.

Se:

```text
current_start_time <= now
```

e:

```text
current_end_time > now
```

mostrar:

```text
● AO VIVO
```

Não confiar somente no texto recebido.

---

# 35. Barra de progresso

Calcular:

```typescript
progress =
  (now - start) /
  (end - start)
```

Limitar:

```text
0 <= progress <= 1
```

Mostrar visualmente quanto do programa atual já passou.

---

# 36. Página do canal

Criar:

```text
/canal/[id]
```

Layout:

```text
Player / área principal
Informações do canal
Programa atual
Próximo programa
Seleção de servidor
Descrição
Outros canais relacionados
```

---

# 37. Player

Criar componente:

```text
ChannelPlayer
```

Se embeds estiverem desabilitados:

```text
Exibição externa desabilitada.
```

Se estiverem habilitados e autorizados:

permitir selecionar entre os providers retornados.

Exemplo:

```text
Servidor Premium   FULL HD
Servidor Alternativo HD
```

---

# 38. Segurança do iframe

Quando um iframe externo autorizado for utilizado:

não conceder permissões desnecessárias.

Estudar e aplicar:

```text
sandbox
allow
referrerPolicy
```

de forma restritiva.

Não utilizar:

```html
allow="*"
```

sem necessidade.

---

# 39. Erro do player

Se o embed externo falhar:

mostrar interface amigável:

```text
Este servidor está indisponível no momento.
Tente outro servidor.
```

Se houver outro provider, oferecer automaticamente a seleção.

Não entrar em loop automático de recarregamento.

---

# 40. EPG

Exibir:

```text
Agora
Próximo
```

Exemplo:

```text
AGORA

CNN 360º
15:00 — 17:55

[██████████████------]

PRÓXIMO

CNN Mercado
17:55 — 18:00
```

---

# 41. Canal sem EPG

Não gerar erro.

Exibir:

```text
Programação não disponível.
```

---

# 42. Busca

Busca deve pesquisar:

```text
name
description
category
```

Inicialmente pode ser implementada no PostgreSQL.

Preparar para futuramente usar:

```text
PostgreSQL Full Text Search
```

---

# 43. Categorias

Criar página:

```text
/categoria/[slug]
```

Exemplo:

```text
/categoria/esportes
/categoria/noticias
/categoria/entretenimento
```

Não depender do nome formatado para buscar no banco.

Criar utilitário para slug.

---

# 44. Favoritos

Criar página:

```text
/favoritos
```

Se nenhum favorito existir:

```text
Você ainda não adicionou canais aos favoritos.
```

---

# 45. Loading

Implementar skeletons.

Não utilizar apenas:

```text
Loading...
```

nas principais telas.

---

# 46. Empty states

Criar estados específicos para:

```text
nenhum canal
nenhum resultado de busca
nenhum favorito
categoria vazia
EPG indisponível
```

---

# 47. Error boundaries

Criar:

```text
error.tsx
not-found.tsx
loading.tsx
```

onde aplicável.

---

# 48. Next.js Image

Configurar domínios remotos necessários para logos e EPG.

Preferir configuração restritiva por hostname.

Nunca liberar indiscriminadamente:

```text
https://**
```

---

# 49. Server Components

Priorizar Server Components para:

```text
homepage
categorias
detalhes do canal
```

Utilizar Client Components somente onde necessário:

```text
busca interativa
favoritos
player
troca de provider
tema
```

---

# 50. SEO

Criar metadata dinâmica.

Canal:

```text
Assistir {channel.name} — programação
```

Descrição:

```text
Confira programação atual e próximos programas de {channel.name}.
```

Não afirmar disponibilidade ou direitos de transmissão que não estejam confirmados.

---

# 51. Sitemap

Criar:

```text
sitemap.xml
robots.txt
```

Incluir páginas públicas de canais e categorias.

---

# 52. Performance

Objetivos:

- evitar fetch repetitivo;
- evitar chamadas upstream por usuário;
- otimizar imagens;
- paginação;
- cache;
- Server Components;
- minimizar JavaScript enviado ao browser.

---

# 53. Cache

O banco Supabase será o principal cache persistente.

Podem ser utilizados adicionalmente recursos de cache do Next.js para consultas públicas.

Nunca permitir cache longo da programação atual.

Sugestões:

```text
lista de categorias: cache mais longo
metadados de canais: cache médio
EPG: cache curto
```

---

# 54. Resiliência

Este requisito é obrigatório.

Se:

```text
api.reidoscanais.st
```

ficar indisponível:

a aplicação deve continuar exibindo os últimos dados sincronizados.

Fluxo:

```text
upstream OFF
     │
     ├── sincronização registra erro
     │
     └── site continua lendo Supabase
```

Nunca apagar dados locais por causa de erro upstream.

---

# 55. DNS

Não codificar IPs do Cloudflare no projeto.

NÃO utilizar permanentemente:

```text
104.21.4.193
172.67.154.45
```

Esses IPs podem mudar.

Utilizar:

```text
https://api.reidoscanais.st
```

normalmente.

Se houver problema DNS no ambiente local, corrigir o resolver DNS da máquina/rede.

Não implementar `--resolve` dentro da aplicação.

---

# 56. Segurança

Aplicar:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
```

Configurar CSP compatível com os recursos realmente utilizados.

Evitar:

```text
unsafe-eval
```

sempre que possível.

---

# 57. URLs externas

Toda URL recebida da API deve ser validada.

Permitir somente:

```text
https:
```

Nunca aceitar:

```text
javascript:
data:
file:
```

como `embed_url`.

---

# 58. SSRF

Nunca criar endpoint como:

```text
/api/proxy?url=<qualquer-url>
```

Isso pode gerar vulnerabilidade SSRF.

Se no futuro existir proxy legítimo para imagens ou metadados, utilizar allowlist rígida de hosts.

---

# 59. Rate limiting

Aplicar rate limiting pelo menos aos endpoints:

```text
/api/search
/api/cron/*
```

Cron deve ter autenticação adicional.

---

# 60. Logs

Logs estruturados.

Exemplo:

```json
{
  "event": "channel_sync",
  "status": "success",
  "received": 110,
  "duration_ms": 831
}
```

Nunca registrar:

```text
service role key
cron secret
tokens
connection strings
```

---

# 61. Observabilidade

Criar função central:

```typescript
logger.info()
logger.warn()
logger.error()
```

Não espalhar:

```typescript
console.log()
```

por toda aplicação.

Durante desenvolvimento `console` pode ser utilizado internamente pela implementação do logger.

---

# 62. Variáveis de ambiente

Criar:

```text
.env.example
```

Com:

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# External API
UPSTREAM_API_URL=https://api.reidoscanais.st

# Cron
CRON_SECRET=

# Features
NEXT_PUBLIC_ENABLE_EXTERNAL_EMBEDS=false
```

Nunca versionar:

```text
.env
.env.local
```

---

# 63. Estrutura sugerida

```text
.
├── app/
│   ├── api/
│   │   ├── channels/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── categories/
│   │   │   └── route.ts
│   │   ├── health/
│   │   │   └── route.ts
│   │   └── cron/
│   │       └── sync-channels/
│   │           └── route.ts
│   │
│   ├── canal/
│   │   └── [id]/
│   │       ├── page.tsx
│   │       ├── loading.tsx
│   │       └── error.tsx
│   │
│   ├── categoria/
│   │   └── [slug]/
│   │       └── page.tsx
│   │
│   ├── favoritos/
│   │   └── page.tsx
│   │
│   ├── layout.tsx
│   ├── page.tsx
│   ├── error.tsx
│   └── not-found.tsx
│
├── components/
│   ├── channel/
│   │   ├── channel-card.tsx
│   │   ├── channel-grid.tsx
│   │   ├── channel-player.tsx
│   │   ├── channel-epg.tsx
│   │   └── provider-selector.tsx
│   │
│   ├── layout/
│   │   ├── header.tsx
│   │   └── footer.tsx
│   │
│   └── ui/
│
├── hooks/
│   └── use-favorites.ts
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── admin.ts
│   │
│   ├── upstream/
│   │   ├── client.ts
│   │   ├── schemas.ts
│   │   ├── channels.ts
│   │   ├── health.ts
│   │   └── types.ts
│   │
│   ├── logger.ts
│   └── utils.ts
│
├── services/
│   └── sync-channels.ts
│
├── supabase/
│   └── migrations/
│
├── types/
│   └── database.ts
│
├── public/
│
├── .env.example
├── README.md
├── PROJECT.md
└── vercel.json
```

---

# 64. Design

Criar visual escuro elegante.

Características:

```text
background quase preto
cards discretos
bordas suaves
logos em destaque
tipografia limpa
bom espaçamento
animações sutis
```

Não exagerar em:

```text
gradientes
glassmorphism
animações
sombras
```

O conteúdo precisa ser o destaque.

---

# 65. Responsividade

Desktop:

```text
5-6 cards por linha
```

Tablet:

```text
3-4 cards
```

Mobile:

```text
2 cards
```

Dependendo da largura disponível.

Não definir isso rigidamente se CSS Grid adaptativo funcionar melhor.

---

# 66. Acessibilidade

Obrigatório:

- HTML semântico;
- navegação via teclado;
- foco visível;
- aria-labels;
- contraste adequado;
- botões com labels;
- imagens com `alt`;
- não depender exclusivamente de cor.

---

# 67. Testes

Adicionar pelo menos:

## Unitários

Testar:

```text
Zod schemas
timestamp conversion
progress calculation
slug generation
normalização
```

## Integração

Testar:

```text
sincronização
upsert
API /channels
API /health
```

## E2E

Testar:

```text
homepage
buscar canal
abrir canal
favoritar
trocar categoria
```

---

# 68. Fixtures

Não utilizar a API externa durante todos os testes.

Criar:

```text
tests/fixtures/channels.json
```

com alguns exemplos sanitizados.

Incluir:

1. canal com um embed;
2. canal com dois embeds;
3. canal sem EPG;
4. canal com EPG;
5. canal sem imagem;
6. canal com descrição ausente.

---

# 69. Primeira sincronização

Criar script:

```text
npm run sync:channels
```

Ele deve permitir popular o banco manualmente.

Exemplo:

```bash
npm run sync:channels
```

Saída:

```text
Channel Sync

Received: 110
Created: 110
Updated: 0
Errors: 0

Sync completed successfully.
```

---

# 70. Scripts

Criar no `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "...",
    "sync:channels": "..."
  }
}
```

---

# 71. Vercel

O projeto deve funcionar diretamente após:

```bash
vercel
```

ou integração do repositório GitHub com a Vercel.

Configurar as variáveis de ambiente no painel da Vercel.

Não depender de arquivo `.env.local` em produção.

---

# 72. Supabase migrations

Todo schema deve estar versionado.

Nunca fazer alterações somente pelo dashboard sem criar migration correspondente.

Estrutura:

```text
supabase/migrations/
20260911_001_initial_schema.sql
20260911_002_indexes.sql
20260911_003_rls.sql
```

---

# 73. README

Criar documentação contendo:

```text
Descrição
Arquitetura
Pré-requisitos
Instalação
Supabase
Variáveis de ambiente
Executar migrations
Executar sincronização
Rodar localmente
Testes
Deploy Vercel
Cron
Troubleshooting
```

---

# 74. Troubleshooting DNS

Documentar que, caso localmente:

```powershell
Resolve-DnsName api.reidoscanais.st
```

falhe mas:

```powershell
Resolve-DnsName api.reidoscanais.st -Server 1.1.1.1
```

funcione, existe problema no resolver DNS local.

Não resolver isso hardcodando IP na aplicação.

---

# 75. Estado da sincronização

No banco, guardar:

```text
última sincronização bem sucedida
última tentativa
status
quantidade de canais
tempo de execução
erro
```

O frontend administrativo poderá utilizar isso futuramente.

---

# 76. Dados desatualizados

Caso a última sincronização tenha ocorrido há muito tempo, a aplicação ainda deve funcionar.

Pode apresentar discretamente:

```text
Programação atualizada há 18 minutos.
```

Não impedir acesso ao catálogo.

---

# 77. Não acoplar frontend ao upstream

Evitar componentes recebendo diretamente tipos como:

```typescript
UpstreamChannel
```

Criar nosso domínio:

```typescript
Channel
ChannelEmbed
ChannelEpg
```

Converter:

```text
UpstreamChannel
       ↓
normalizer
       ↓
Domain Channel
```

Isso permitirá trocar a fonte externa futuramente.

---

# 78. Repository Pattern

Criar abstrações para o banco:

```text
ChannelRepository
EpgRepository
EmbedRepository
SyncRepository
```

Não colocar queries Supabase diretamente dentro dos componentes React.

---

# 79. Camadas

Arquitetura:

```text
UI
 │
 ▼
Services
 │
 ▼
Repositories
 │
 ▼
Supabase
```

Integração:

```text
Upstream
 │
 ▼
Adapter
 │
 ▼
Normalizer
 │
 ▼
Sync Service
 │
 ▼
Repositories
```

---

# 80. Futuras fontes

Projetar para futuramente ser possível adicionar:

```text
outra API
XMLTV
API própria
EPG próprio
canais próprios
YouTube Live autorizado
```

sem reescrever o frontend.

---

# 81. Feature flags

Criar módulo:

```text
src/config/features.ts
```

Exemplo:

```typescript
export const features = {
  externalEmbeds:
    process.env.NEXT_PUBLIC_ENABLE_EXTERNAL_EMBEDS === "true"
}
```

---

# 82. Página administrativa futura

Não é necessário implementar inicialmente.

Entretanto preparar arquitetura para:

```text
/admin
```

com:

```text
status upstream
última sincronização
canais ativos
canais inativos
erros
providers
forçar sincronização
```

---

# 83. Qualidade do código

Regras obrigatórias:

```text
TypeScript strict
sem any desnecessário
funções pequenas
nomes descritivos
componentes reutilizáveis
separação de responsabilidades
tratamento de erro explícito
```

Não utilizar:

```typescript
as any
```

para esconder erros de tipagem.

---

# 84. Commits sugeridos

Implementar em etapas pequenas.

Exemplo:

```text
chore: initialize nextjs project

feat: add supabase database schema

feat: add upstream api client

feat: implement channel synchronization

feat: add channel repository

feat: implement channels api

feat: create channel catalog interface

feat: add channel details page

feat: add epg progress

feat: add favorites

feat: add cron synchronization

feat: add health monitoring

test: add synchronization tests

docs: add setup and deployment instructions
```

---

# 85. Etapas de desenvolvimento

Executar nesta ordem.

## Fase 1

Estrutura básica:

```text
Next.js
TypeScript
Tailwind
shadcn
Supabase
.env.example
```

---

## Fase 2

Criar banco:

```text
channels
channel_embeds
channel_epg
sync_logs
```

---

## Fase 3

Implementar cliente upstream.

Testar:

```text
GET /health
GET /channels
```

---

## Fase 4

Implementar sincronização.

Popular Supabase com os aproximadamente:

```text
110 canais
```

retornados atualmente pela API.

---

## Fase 5

Criar repositories.

---

## Fase 6

Criar APIs internas.

---

## Fase 7

Criar homepage e catálogo.

---

## Fase 8

Criar página individual do canal.

---

## Fase 9

Adicionar EPG.

---

## Fase 10

Adicionar favoritos e busca.

---

## Fase 11

Adicionar cron.

---

## Fase 12

Testes e segurança.

---

## Fase 13

Deploy na Vercel.

---

# 86. Critérios de aceite

O projeto somente deve ser considerado concluído quando:

- [ ] build executar sem erros;
- [ ] TypeScript executar sem erros;
- [ ] lint executar sem erros;
- [ ] migrations funcionarem em banco vazio;
- [ ] sincronização conseguir importar canais;
- [ ] múltiplos embeds forem suportados;
- [ ] canal sem EPG não quebrar;
- [ ] canal sem imagem não quebrar;
- [ ] API externa indisponível não derrubar o site;
- [ ] catálogo vier do Supabase;
- [ ] busca funcionar;
- [ ] categorias funcionarem;
- [ ] favoritos funcionarem;
- [ ] página de canal funcionar;
- [ ] layout mobile funcionar;
- [ ] cron possuir autenticação;
- [ ] Service Role nunca chegar ao browser;
- [ ] `.env` não estiver versionado;
- [ ] `/api/health` funcionar;
- [ ] README explicar deployment;
- [ ] aplicação realizar deploy corretamente na Vercel.

---

# 87. Princípio principal

A API externa deve ser considerada:

```text
SOURCE
```

e não:

```text
DEPENDÊNCIA DIRETA DO FRONTEND
```

A nossa aplicação precisa controlar:

```text
dados
cache
modelo
API
frontend
sincronização
tratamento de erros
```

Assim, se amanhã a API upstream mudar, somente a camada:

```text
lib/upstream
```

e eventualmente:

```text
services/sync
```

deverão ser alteradas.

O restante da aplicação deve continuar funcionando.

---

# 88. Instrução para o agente

Você é responsável por implementar este projeto como um engenheiro de software sênior.

Não implemente tudo em um único arquivo.

Antes de começar:

1. leia este `PROJECT.md`;
2. examine o repositório existente;
3. crie um plano de implementação;
4. preserve código existente que estiver correto;
5. implemente uma fase por vez;
6. execute lint, typecheck e testes após alterações relevantes;
7. corrija erros encontrados antes de avançar;
8. mantenha migrations versionadas;
9. mantenha `.env.example` atualizado;
10. atualize o README ao final.

Não substitua implementações funcionais por mocks apenas para fazer testes passarem.

Não silencie erros TypeScript.

Não remova validações de segurança para simplificar desenvolvimento.

Quando houver ambiguidade de implementação, escolha a solução mais simples, segura, sustentável e compatível com Vercel + Supabase.

---

# 89. Primeira tarefa

Comece agora pela **Fase 1**.

Analise este documento e crie a estrutura inicial do projeto utilizando:

```text
Next.js
TypeScript
App Router
Tailwind CSS
shadcn/ui
Supabase
Zod
```

Em seguida:

1. apresente a estrutura criada;
2. crie `.env.example`;
3. configure Supabase client/server/admin;
4. prepare `supabase/migrations`;
5. não implemente ainda o player;
6. não implemente ainda autenticação;
7. não invente dados;
8. deixe o projeto pronto para iniciar a Fase 2.

Ao terminar a Fase 1, execute:

```bash
npm run lint
npm run typecheck
npm run build
```

Corrija todos os erros antes de considerar a fase concluída.