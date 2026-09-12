# Fatec Flix

Catálogo web de canais de TV: listagem por categoria, busca, programação
atual/próxima (EPG), múltiplos servidores por canal e favoritos.

Ver a especificação completa do produto em
[`PROJECT.md — Plataforma de Canais.md`](<./PROJECT.md — Plataforma de Canais.md>)
e os requisitos de segurança em [`SECURITY-OWASP-TOP-10-2025.md`](./SECURITY-OWASP-TOP-10-2025.md).

> **Status:** todas as fases do `PROJECT.md` implementadas (ver
> "Roadmap" no fim deste documento) — sincronização, APIs internas,
> catálogo, página de canal/categoria, favoritos, cron, extensão de
> ad-block opcional, testes (unitário/integração/E2E) e CI.

## Arquitetura

```text
Rei dos Canais API (upstream, api.reidoscanais.st)
        │
        ▼
Next.js Server / Sync Service   (ainda não implementado)
        │
        ▼
Supabase PostgreSQL             (schema já versionado)
        │
        ▼
Next.js (App Router)
        │
        ▼
Vercel
        │
        ▼
Usuário
```

A API externa é tratada como fonte de dados upstream, nunca como banco
principal. O frontend não chama `api.reidoscanais.st` diretamente do
browser — a integração acontece no servidor, sincronizando dados para o
Supabase, que funciona como cache persistente e fallback.

## Pré-requisitos

- Node.js ≥ 18.18 (testado com Node 22)
- npm
- Um projeto no [Supabase](https://supabase.com)
- Supabase CLI (opcional, para rodar as migrations por linha de comando)

## Instalação

```bash
npm install
```

Para rodar os testes E2E (`npm run test:e2e`), instale o navegador do
Playwright uma vez:

```bash
npx playwright install chromium
```

## Supabase

1. Crie um projeto no Supabase (ou use um existente).
2. Copie a URL do projeto e as chaves em **Project Settings → API**.
3. Rode as migrations de `supabase/migrations/` (veja "Executar migrations"
   abaixo) para criar as tabelas `channels`, `channel_embeds`,
   `channel_epg`, `sync_logs`, `app_settings`, seus índices e as policies
   de Row Level Security.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha os valores:

```bash
cp .env.example .env.local
```

| Variável | Descrição |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima (respeita RLS). Pode ir ao browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de service role. **Nunca** deve chegar ao browser — uso exclusivo em `lib/supabase/admin.ts`, no servidor. |
| `UPSTREAM_API_URL` | URL da API externa (`https://api.reidoscanais.st`). |
| `CRON_SECRET` | Segredo usado para autenticar o endpoint de cron. |
| `NEXT_PUBLIC_ENABLE_EXTERNAL_EMBEDS` | Liga/desliga a renderização de embeds externos. Mantenha `false` até haver autorização de uso do conteúdo. |

Nunca versione `.env` ou `.env.local`.

## Executar migrations

Usando o Supabase CLI:

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

Ou aplique manualmente, na ordem, os arquivos de `supabase/migrations/`
pelo SQL Editor do painel do Supabase:

1. `20260911_001_initial_schema.sql`
2. `20260911_002_indexes.sql`
3. `20260911_003_rls.sql`

## Executar sincronização

```bash
npm run sync:channels
```

Busca os canais no upstream, valida com Zod, normaliza e faz upsert em
`channels`, `channel_embeds` e `channel_epg`, registrando o resultado em
`sync_logs`. Canais/embeds que somem do upstream são marcados
`active = false` (nunca deletados). Uma sincronização já em andamento é
detectada via advisory lock do Postgres — a segunda chamada simultânea
sai com `status: skipped` em vez de rodar em paralelo. Requer a
migration `20260911_004_sync_lock.sql` aplicada (ver "Executar
migrations").

## Rodar localmente

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Testes

```bash
npm test          # unitários + integração (Vitest)
npm run test:e2e  # E2E (Playwright)
```

**Unitários** (`tests/unit/`) — lógica pura, sem rede/banco: schemas
Zod (`lib/upstream/schemas.ts`, incluindo rejeição de `javascript:`/
`data:`/http), conversão de timestamp e normalização
(`lib/upstream/normalizer.ts`), cálculo de "ao vivo"/progresso
(`lib/epg.ts`), geração de slug (`lib/slug.ts`), `dedupeBy`/`groupBy`
(`lib/utils.ts`). Usa os fixtures de `tests/fixtures/channels.json`
(6 casos exigidos: um embed, dois embeds, sem EPG, com EPG, sem
imagem, sem descrição) — a API externa nunca é chamada nos testes.

**Integração** (`tests/integration/`) — testa repositories,
`services/sync-channels.ts` (sincronização completa, dedupe de
duplicata do upstream, lock, canal removido vira inativo,
`sync_logs`) e as rotas `/api/channels`, `/api/health`,
`/api/cron/sync-channels`, contra um **fake do Supabase em memória**
(`tests/helpers/fake-supabase-client.ts`) — nunca toca no projeto
Supabase real. `services/sync-channels.ts` aceita um client Supabase
injetável (`syncChannels(client?)`) só para viabilizar isso.

**E2E** (`tests/e2e/`, Playwright) — sobe o **build de produção**
(`next build && next start`; rodar contra `next dev` com múltiplos
workers em paralelo estoura timeout, o dev server compila cada rota
sob demanda) e testa contra o Supabase/upstream reais já
sincronizados: homepage, tema, busca (com e sem resultado), abrir
canal (existente e 404), favoritar/desfavoritar, trocar categoria (com
e sem resultado). As asserções evitam depender de nomes de canal
específicos que podem mudar no upstream.

## CI

`.github/workflows/ci.yml` roda em todo push/PR para `main`, em dois
jobs:

- **test** — `typecheck`, `lint` e `npm test` (unitário + integração).
  Não depende de nenhuma secret — os testes de integração usam o fake
  Supabase em memória, nunca o banco real.
- **build** — `next build` de verdade. `/sitemap.xml` é estático e
  busca canais reais no Supabase (`lib/api/get-catalog.ts`), então
  esse job precisa de duas secrets no repositório (**Settings > Secrets
  and variables > Actions**): `NEXT_PUBLIC_SUPABASE_URL` e
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` — os mesmos valores já configurados
  na Vercel. São seguros por design (prefixo `NEXT_PUBLIC_`: já vão
  expostos a qualquer visitante do site pelo browser; quem protege o
  dado é a RLS, não o segredo da URL/anon key). Sem essas secrets
  configuradas, o job `build` falha com um erro claro pedindo elas.

## Deploy Vercel

```bash
vercel
```

Ou integre o repositório GitHub diretamente pelo painel da Vercel.
Configure todas as variáveis de ambiente listadas acima no painel do
projeto — a aplicação não deve depender de `.env.local` em produção.

## Cron

`GET`/`POST /api/cron/sync-channels` roda a sincronização. Exige o
header `Authorization: Bearer <CRON_SECRET>` — sem ele (ou com valor
errado), responde `401` (fail closed). Também tem rate limit próprio
(6 requisições/minuto por IP) além da autenticação, para limitar o
estrago de um `CRON_SECRET` vazado.

`vercel.json` declara o schedule. **O plano Hobby (grátis) da Vercel só
permite cron 1x/dia** — por isso está `"0 6 * * *"` (todo dia às 6h),
em vez dos 5 minutos sugeridos no §25. Pra sincronizar com mais
frequência, dá pra: rodar `npm run sync:channels` manualmente/via outro
agendador (GitHub Actions, etc.), ou fazer upgrade pra Vercel Pro e
trocar o schedule pra `*/5 * * * *`.

A Vercel injeta automaticamente o header `Authorization: Bearer
$CRON_SECRET` nas chamadas que ela mesma dispara quando essa env var
existe no projeto — não é preciso configurar isso manualmente, só
garantir que `CRON_SECRET` esteja setado no painel da Vercel.

Respostas: `200` (sucesso/parcial), `409` se uma sincronização já
estava rodando (lock ocupado), `401` sem autenticação, `429` acima do
rate limit, `500` em falha real.

## Segurança do player — desvio deliberado do §38 (2026-09-12)

`components/channel/channel-player.tsx` **não usa mais `sandbox`** no
iframe do player. Motivo: providers como `rdcanais.net` detectam o
atributo e bloqueiam a exibição até ele ser removido (mensagem "Acesso
Bloqueado" pedindo pra tirar o sandbox).

Isso foi uma escolha explícita do dono do projeto, não uma decisão
minha — cheguei a propor manter o sandbox com tokens adicionais como
meio-termo, mas foi pedido remover de fato. Importante registrar o
trade-off real, sem maquiar:

- **Sem `sandbox`, não existe mecanismo nosso pra bloquear popup**
  disparado pelo provider — isso é justamente o que o `sandbox`
  fazia. Um popup/redirecionamento por clique não é impedido por
  nada do nosso lado; só o bloqueador nativo do navegador de cada
  usuário (que não bloqueia popup disparado por clique direto).
- Mitigação parcial aplicada via `allow` (Permissions-Policy):
  `camera`, `microphone`, `geolocation`, `payment`, `usb`, `midi`,
  `xr-spatial-tracking` e `clipboard-write` explicitamente negados —
  reduz o que um anúncio malicioso consegue pedir ao navegador, mas
  não impede popup/redirecionamento de aba.
- A checagem de "`embed_url` nunca aponta pro nosso próprio domínio"
  (`getSafeEmbedUrl`) ficou ainda mais crítica sem o sandbox como
  segunda camada — continua em vigor.
- Isso só vale a pena com `NEXT_PUBLIC_ENABLE_EXTERNAL_EMBEDS=true`
  para providers com essa autorização (PROJECT.md §3.2). Se a origem
  dos embeds mudar no futuro, reavaliar se ainda faz sentido.

Como mitigação parcial pro problema de anúncio que o sandbox resolvia,
existe `extension/` — uma extensão de navegador **opcional e
experimental**, instalada manualmente por quem quiser (nenhum site
consegue instalar extensão sozinho no navegador de quem visita).
Bloqueia uma lista pública de redes de anúncio conhecidas e esconde
avisos tipo "desative seu bloqueador" por correspondência de texto —
não foi testada contra o servidor real, e não modifica/redistribui
conteúdo de terceiro (só muda o que o navegador de quem instalou
escolhe carregar). Instruções em `extension/README.md` e na página
`/extensao` do site.

**O que foi recusado nesse processo, e por quê**: um proxy que
buscasse o HTML/vídeo do provider no servidor, removesse os anúncios e
servisse como conteúdo nosso. Diferente da extensão, isso modificaria e
redistribuiria conteúdo de terceiro sem autorização — exatamente o que
PROJECT.md §3.2/§58 já proibiam desde o início do projeto.

## Troubleshooting

### `/canal/[id]` inexistente responde 200 em vez de 404

Comportamento conhecido do Next.js App Router: como `app/loading.tsx` e
`app/canal/[id]/loading.tsx` existem (skeletons — exigência de
PROJECT.md §45/§47), o Next envia o shell da resposta com status 200
antes do `notFound()` da página resolver. A UI de "página não
encontrada" é exibida corretamente — só o status HTTP da resposta em
si fica 200. Verificamos manualmente: sem nenhum `loading.tsx` na
árvore de rotas, o 404 real volta a funcionar; optamos por manter os
skeletons em vez de sacrificar essa UX por causa do status code.

### DNS local não resolve `api.reidoscanais.st`

Se localmente

```powershell
Resolve-DnsName api.reidoscanais.st
```

falhar, mas

```powershell
Resolve-DnsName api.reidoscanais.st -Server 1.1.1.1
```

funcionar, o problema é do resolver DNS local/da rede — corrija-o no SO.
Não hardcode IPs do Cloudflare na aplicação; eles podem mudar.

### Encoding de caracteres

Textos com acentuação exibidos incorretamente no terminal (ex.:
`Not├¡cias`) geralmente indicam que o próprio terminal (ex.: PowerShell)
não está interpretando UTF-8 corretamente — não é necessariamente um
problema no JSON retornado pela API. Nunca aplicar substituições manuais
de string sem antes confirmar que o problema existe na resposta HTTP
original.

## Roadmap

- [x] Fase 1 — Next.js, TypeScript, Tailwind, shadcn/ui, clients Supabase
- [x] Fase 2 — Schema do banco (migrations versionadas)
- [x] Fase 3 — Cliente da API upstream (`lib/upstream/`)
- [x] Fase 4 — Serviço de sincronização (`services/sync-channels.ts`)
- [x] Fase 5 — Repositories
- [x] Fase 6 — APIs internas (`/api/channels`, `/api/categories`, `/api/health`, cron)
- [x] Fase 7 — Homepage e catálogo
- [x] Fase 8 — Página individual do canal
- [x] Checkup de segurança e correção (2026-09-11) — ver seção abaixo
- [x] Página `/categoria/[slug]` (§43)
- [x] `sitemap.xml` / `robots.txt` (§51)
- [x] Testes unitários, integração e E2E (§67/§68)
- [x] CI (GitHub Actions): typecheck, lint, testes e build em todo push/PR

## Checkup de segurança e correção (2026-09-11)

Revisão completa de tudo (code-review multi-ângulo + security-review),
usando as skills do projeto. Achados reais corrigidos:

**Correção:**
- O lock de concorrência da sincronização (§26) não funcionava de
  verdade: `pg_advisory_lock`/`unlock` são por sessão do Postgres, mas
  o client fala com o banco via PostgREST/pooler (sem afinidade de
  sessão entre chamadas `.rpc()`). Trocado por lock baseado em linha
  de tabela com TTL (`supabase/migrations/20260911_005_fix_sync_lock.sql`),
  testado com chamadas concorrentes reais.
- Upsert em lote quebrava a sincronização inteira se o upstream
  mandasse um canal/embed duplicado na mesma resposta (erro do
  Postgres em `ON CONFLICT`). Agora deduplica antes de gravar.
- Rate limit contornável trocando o header `X-Forwarded-For` a cada
  request (usava a primeira entrada da lista, que o cliente controla).
  Corrigido para usar `x-real-ip`/a última entrada.
- `/api/health` não detectava uma sincronização travada em `running`
  (função serverless derrubada no meio) — agora trata como falha após
  15 minutos.

**Segurança:**
- RLS de `channel_epg` vazava programação de canais já inativos —
  faltava o filtro `active = true` que `channels`/`channel_embeds` já
  tinham (`20260911_006_fix_channel_epg_rls.sql`).
- `logo_url` e a imagem do EPG aceitavam `javascript:`/`data:` (só
  `embed_url` tinha a validação https-only do §57). Corrigido no schema
  Zod e revalidado na serialização.
- Segredo do cron vazava seu tamanho por timing antes da comparação
  em tempo constante rodar. Corrigido comparando hashes SHA-256 de
  tamanho fixo.
- Adicionados headers de segurança (§56): CSP com nonce por
  requisição, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy` (`proxy.ts`).
- `embed_url` da API agora some quando `NEXT_PUBLIC_ENABLE_EXTERNAL_EMBEDS`
  está desligado (antes só a renderização era desligada, a URL do
  servidor externo continuava saindo pela API).
- Player nunca aponta o iframe pro próprio domínio do app (evita abuso
  de `allow-same-origin` do sandbox).
- **Achado antes de qualquer dano**: `git add -A` capturou
  `supabase/.temp/pooler-url` (connection string do Postgres com senha
  real, gerada pelo Supabase CLI) — nunca foi commitado, só ficou
  staged localmente por um instante. Adicionado ao `.gitignore`.

**Migração para `next@16` — `proxy.ts`**: o arquivo `middleware.ts` foi
descontinuado pelo Next 16 em favor de `proxy.ts` (aviso visto no
build); migrado.

**Decisões conscientes, não corrigidas** (documentado no código onde
relevante): allowlist fixa de hosts para `embed_url` não é viável sem
saber todos os providers que o upstream pode adicionar no futuro;
`select("*")` nos repositories não foi restringido a colunas
específicas (catálogo pequeno, ~110 canais, custo de payload
desprezível frente à complexidade de tipar selects parciais);
duplicação do padrão "select + upsert + diff" entre
channel-repository/embed-repository não foi extraída pra um helper
comum (não é mais um risco de corrupção de dado agora que o lock
funciona de verdade).
