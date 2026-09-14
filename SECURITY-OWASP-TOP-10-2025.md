# SECURITY.md — Segurança da Plataforma de Canais

> **Status:** requisito obrigatório do projeto  
> **Stack alvo:** Next.js + TypeScript + Vercel + Supabase/PostgreSQL  
> **Base de segurança:** OWASP Top 10:2025  
> **Aplicação:** catálogo de canais, EPG, sincronização de API externa e, quando expressamente habilitado/autorizado, embeds externos.

---

# 1. Objetivo

Este documento define os requisitos mínimos e obrigatórios de segurança do projeto.

Ele deve ser lido pelo Claude Code, Codex ou qualquer outro agente de desenvolvimento **antes de criar ou modificar funcionalidades sensíveis**.

Segurança não deve ser tratada como uma etapa posterior.

Ela deve fazer parte de:

- arquitetura;
- banco de dados;
- APIs;
- integração com serviços externos;
- frontend;
- autenticação futura;
- CI/CD;
- deploy;
- monitoramento;
- tratamento de erros;
- manutenção de dependências.

O projeto deve seguir o princípio:

```text
secure by design
secure by default
least privilege
deny by default
fail safely
```

---

# 2. Referência principal

Este projeto adota como referência:

```text
OWASP Top 10:2025
```

Categorias:

```text
A01:2025 — Broken Access Control
A02:2025 — Security Misconfiguration
A03:2025 — Software Supply Chain Failures
A04:2025 — Cryptographic Failures
A05:2025 — Injection
A06:2025 — Insecure Design
A07:2025 — Authentication Failures
A08:2025 — Software or Data Integrity Failures
A09:2025 — Security Logging and Alerting Failures
A10:2025 — Mishandling of Exceptional Conditions
```

Referências:

```text
https://top10.owasp.org/2025/
https://owasp.org/projects/top-ten/
```

Este arquivo não substitui uma auditoria de segurança completa, pentest ou um programa baseado em OWASP ASVS.

---

# 3. Princípios obrigatórios

Toda implementação deve seguir estes princípios.

## 3.1 Menor privilégio

Cada componente deve possuir apenas as permissões necessárias.

Exemplos:

```text
browser
  ↓
Supabase anon key
  ↓
somente SELECT autorizado por RLS
```

Nunca:

```text
browser
  ↓
service role
```

---

## 3.2 Negar por padrão

Quando houver dúvida sobre uma permissão:

```text
DENY
```

Acesso deve ser explicitamente concedido.

---

## 3.3 Server-side para operações privilegiadas

Operações privilegiadas devem ocorrer exclusivamente no servidor.

Inclui:

- service role do Supabase;
- sincronização upstream;
- alteração administrativa;
- execução de cron;
- operações de manutenção;
- secrets;
- chamadas internas privilegiadas.

---

## 3.4 Não confiar em input externo

Considerar não confiáveis:

```text
query string
route params
headers
cookies
JSON do cliente
dados da API upstream
embed_url
logo_url
EPG
webhooks
dados do banco que vieram originalmente de fonte externa
```

Todos devem passar por validação.

---

# 4. Modelo de ameaça

## 4.1 Ativos que devem ser protegidos

Proteger especialmente:

```text
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
tokens futuros
credenciais administrativas
dados de usuários futuros
favoritos sincronizados
logs
configurações
banco Supabase
pipeline CI/CD
conta Vercel
conta Supabase
repositório GitHub
```

---

## 4.2 Fronteiras de confiança

Considerar fronteiras distintas:

```text
Browser
   │
   ▼
Vercel / Next.js
   │
   ├────────► Supabase
   │
   └────────► API externa
```

A API externa nunca deve ser considerada confiável apenas por ser conhecida.

---

## 4.3 Fontes externas

A aplicação consome uma API upstream.

Tratar seus dados como:

```text
UNTRUSTED INPUT
```

Mesmo quando ela estiver funcionando normalmente.

Nunca assumir que:

```text
id
name
description
category
logo_url
embed_url
EPG
```

são sempre válidos ou seguros.

---

# 5. A01:2025 — Broken Access Control

## 5.1 Riscos neste projeto

Possíveis falhas:

- usuário comum acessando endpoint administrativo;
- frontend utilizando Service Role;
- cron executável sem autenticação;
- alteração de canais via Supabase diretamente;
- RLS ausente;
- IDOR em recursos futuros;
- endpoint aceitando qualquer URL e fazendo fetch;
- SSRF através de proxy;
- usuário controlando `channel_id` sem autorização;
- funções administrativas expostas publicamente.

---

# 6. Supabase RLS

RLS deve estar habilitado em todas as tabelas acessíveis através da API do Supabase.

Exemplo:

```sql
alter table channels enable row level security;
alter table channel_embeds enable row level security;
alter table channel_epg enable row level security;
alter table sync_logs enable row level security;
```

---

## 6.1 Channels

Se canais forem públicos:

```sql
create policy "public_read_channels"
on channels
for select
to anon, authenticated
using (active = true);
```

Não criar políticas de:

```text
INSERT
UPDATE
DELETE
```

para `anon`.

---

## 6.2 Embeds

Se embeds forem expostos ao frontend, analisar separadamente.

Caso não precisem ser consultados diretamente via Supabase pelo browser:

```text
não criar policy de SELECT para anon
```

Preferir entregá-los através do backend Next.js.

---

## 6.3 EPG

Pode existir política pública de leitura.

Nunca permitir escrita pelo usuário.

---

## 6.4 Sync logs

`sync_logs` não deve ser público.

Preferência:

```text
sem policy pública
```

Apenas backend privilegiado deve consultar.

---

# 7. Service Role

A variável:

```env
SUPABASE_SERVICE_ROLE_KEY=
```

é segredo crítico.

Regras obrigatórias:

- nunca prefixar com `NEXT_PUBLIC_`;
- nunca importar `admin.ts` em Client Component;
- nunca retornar a chave em resposta;
- nunca registrar em log;
- nunca adicionar ao Git;
- nunca enviar para analytics;
- nunca colocar em HTML;
- nunca usar em `localStorage`;
- nunca usar em código que pode ser bundled para browser.

Criar:

```text
lib/supabase/admin.ts
```

e proteger o módulo:

```typescript
import "server-only"
```

---

# 8. Separação dos clientes Supabase

Estrutura obrigatória:

```text
lib/supabase/
├── browser.ts
├── server.ts
└── admin.ts
```

`browser.ts`:

```text
anon key
```

`server.ts`:

```text
anon key + contexto de sessão
```

`admin.ts`:

```text
service role
server-only
```

Nunca misturar os três.

---

# 9. SSRF

Não criar endpoints como:

```text
/api/proxy?url=https://qualquer-site.com
/api/image?url=...
/api/fetch?target=...
```

Se algum proxy for realmente necessário, implementar allowlist fixa.

Exemplo conceitual:

```typescript
const ALLOWED_HOSTS = new Set([
  "cdn.reidoscanais.st",
  "api.reidoscanais.st"
])
```

Validar com `new URL()`.

Obrigatório:

```text
protocol === "https:"
hostname pertence à allowlist
sem redirects para hosts não permitidos
```

Bloquear hosts locais e privados.

Exemplos que nunca devem ser acessados a partir de URL controlável pelo usuário:

```text
localhost
127.0.0.1
0.0.0.0
::1
169.254.169.254
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
fc00::/7
fe80::/10
```

Preferencialmente, não implementar proxy genérico.

---

# 10. Cron

Endpoint sugerido:

```text
POST /api/cron/sync-channels
```

Deve exigir:

```text
Authorization: Bearer <CRON_SECRET>
```

Requisitos:

- apenas POST;
- segredo forte;
- nenhum segredo em query string;
- rate limiting;
- resposta genérica para falhas de autenticação;
- logs de execução;
- proteção contra execução concorrente.

Nunca:

```text
GET /api/cron/sync?secret=123
```

---

# 11. A02:2025 — Security Misconfiguration

Possíveis riscos:

- headers ausentes;
- CORS aberto;
- stack trace em produção;
- `.env` publicado;
- bucket Supabase público sem necessidade;
- RLS desativado;
- debug ativo;
- permissões amplas;
- iframe permissivo;
- CSP ausente;
- source maps ou endpoints internos revelando dados sensíveis;
- dashboard administrativo público.

---

# 12. Headers de segurança

Configurar no Next.js/Vercel.

Mínimo:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
Strict-Transport-Security
```

Também considerar:

```text
Cross-Origin-Opener-Policy
Cross-Origin-Resource-Policy
```

dependendo da necessidade real da aplicação.

---

# 13. X-Content-Type-Options

Usar:

```text
X-Content-Type-Options: nosniff
```

---

# 14. Referrer Policy

Sugestão inicial:

```text
Referrer-Policy: strict-origin-when-cross-origin
```

Pode ser mais restritiva se compatível.

---

# 15. Permissions Policy

Desabilitar recursos não utilizados.

Exemplo:

```text
camera=()
microphone=()
geolocation=()
payment=()
usb=()
```

Adicionar somente recursos realmente necessários.

---

# 16. HSTS

Em produção HTTPS:

```text
Strict-Transport-Security
```

Não habilitar configurações agressivas de preload antes de confirmar que todos os subdomínios pertinentes funcionam exclusivamente em HTTPS.

---

# 17. Content Security Policy

Criar CSP restritiva.

Começar por:

```text
default-src 'self'
object-src 'none'
base-uri 'self'
frame-ancestors 'none'
form-action 'self'
```

Adicionar domínios externos somente quando necessários.

Exemplo conceitual:

```text
img-src 'self' https: data:
connect-src 'self' https://<projeto>.supabase.co
frame-src <allowlist explícita de hosts autorizados>
```

Não utilizar:

```text
frame-src *
connect-src *
default-src *
```

---

# 18. Iframes externos

External embeds devem estar:

```env
NEXT_PUBLIC_ENABLE_EXTERNAL_EMBEDS=false
```

por padrão.

Se forem legalmente autorizados e habilitados:

- allowlist de hosts;
- `sandbox`;
- `referrerPolicy`;
- permissões mínimas;
- CSP `frame-src` específica;
- não aceitar URL arbitrária enviada pelo browser.

O iframe deve ser derivado de dados validados pelo backend.

---

# 19. CORS

Não configurar:

```text
Access-Control-Allow-Origin: *
```

em endpoints administrativos.

Para APIs destinadas exclusivamente ao próprio frontend, evitar CORS desnecessário.

Se CORS for necessário:

```text
allowlist explícita
```

---

# 20. Produção

Em produção:

```text
NODE_ENV=production
```

Não expor:

- stack traces;
- SQL;
- nomes internos desnecessários;
- tokens;
- filesystem paths;
- configurações secretas.

---

# 21. A03:2025 — Software Supply Chain Failures

Esta categoria é obrigatória devido ao uso de:

```text
Next.js
React
Supabase JS
Tailwind
shadcn/ui
Zod
Vercel
npm ecosystem
GitHub Actions
```

---

# 22. Lockfile

Versionar:

```text
package-lock.json
```

ou equivalente do package manager escolhido.

Nunca executar em CI uma instalação que ignore o lockfile.

Com npm:

```bash
npm ci
```

Preferir a:

```bash
npm install
```

em CI.

---

# 23. Dependências

Antes de adicionar pacote:

1. verificar se é realmente necessário;
2. verificar manutenção;
3. evitar dependências abandonadas;
4. minimizar pacote com install scripts;
5. não instalar pacotes apenas para funções triviais.

---

# 24. Auditoria de dependências

CI deve executar verificação de vulnerabilidades.

Exemplo mínimo:

```bash
npm audit --omit=dev --audit-level=high
```

Complementar quando possível com:

```text
Dependabot
Renovate
OSV Scanner
```

Não fazer atualização major automática sem testes.

---

# 25. GitHub Dependabot

Criar:

```text
.github/dependabot.yml
```

para:

```text
npm
github-actions
```

Agrupar atualizações quando fizer sentido.

---

# 26. GitHub Actions

Actions devem preferencialmente ser pinadas em versões confiáveis.

Para ambientes de alta segurança, considerar pin por SHA.

Não utilizar Actions desconhecidas sem revisão.

---

# 27. Secrets em CI

Secrets devem usar:

```text
GitHub Secrets
Vercel Environment Variables
Supabase secrets
```

Nunca:

```text
arquivo commitado
workflow hardcoded
echo em log
```

---

# 28. Secret scanning

Habilitar:

```text
GitHub secret scanning
push protection
```

Quando disponível.

Adicionar ferramenta como Gitleaks no CI é recomendado.

Exemplo:

```text
gitleaks detect
```

---

# 29. A04:2025 — Cryptographic Failures

Não implementar criptografia própria.

Nunca criar:

```text
custom encryption algorithm
custom password hash
custom token signing
```

Usar bibliotecas/plataformas consolidadas.

---

# 30. TLS

Toda comunicação deve utilizar:

```text
HTTPS
```

Bloquear URLs externas `http:` quando puderem carregar conteúdo sensível ou ativo.

---

# 31. Secrets

Secrets devem possuir entropia adequada.

Exemplo para cron:

```text
32 bytes aleatórios ou mais
```

Rotacionar segredo quando:

- houver suspeita de vazamento;
- colaborador com acesso sair;
- segredo aparecer em commit/log;
- ambiente for comprometido.

---

# 32. Senhas futuras

Se Supabase Auth for utilizado:

não armazenar senha na nossa própria tabela.

Delegar gerenciamento de credenciais ao Supabase Auth.

---

# 33. Dados sensíveis

Se futuramente existirem dados pessoais:

- coletar somente o necessário;
- classificar dados;
- aplicar retenção;
- proteger backups;
- evitar dados sensíveis em logs.

---

# 34. A05:2025 — Injection

Riscos:

```text
SQL Injection
XSS
HTML Injection
Command Injection
Header Injection
Log Injection
```

---

# 35. SQL

Utilizar Supabase client e queries parametrizadas.

Nunca construir:

```typescript
const sql = `select * from channels where name = '${input}'`
```

Não usar SQL raw com concatenação de usuário.

---

# 36. Busca

Parâmetro:

```text
?q=
```

deve:

- ser validado;
- possuir tamanho máximo;
- ser normalizado;
- não ser inserido em SQL raw.

Exemplo:

```text
mínimo: 1
máximo: 100 caracteres
```

---

# 37. Zod

Toda entrada de Route Handler deve ter schema.

Exemplo:

```typescript
const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24)
})
```

---

# 38. Route params

Validar:

```text
/canal/[id]
```

Não confiar no formato do `id`.

Exemplo:

```typescript
z.string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/)
```

Ajustar regex de acordo com IDs reais.

---

# 39. XSS

React escapa strings por padrão.

Não utilizar:

```typescript
dangerouslySetInnerHTML
```

para:

```text
description
EPG
nome
categoria
conteúdo upstream
```

Se algum dia HTML externo precisar ser renderizado, usar sanitização específica e allowlist de tags.

Preferência:

```text
renderizar como texto
```

---

# 40. URLs

Validar:

```typescript
const url = new URL(value)

if (url.protocol !== "https:") {
  throw new Error("invalid protocol")
}
```

Criar schemas separados para:

```text
logo URL
EPG image URL
embed URL
```

com allowlist adequada.

---

# 41. Command Injection

Não utilizar:

```typescript
exec(userInput)
spawn(commandFromUser)
```

em funções acessíveis pelo usuário.

O projeto não deveria precisar executar shell em runtime.

---

# 42. A06:2025 — Insecure Design

Segurança deve existir na arquitetura, não apenas em validações pontuais.

---

# 43. Casos de abuso

Considerar pelo menos:

```text
usuário faz milhares de buscas
usuário tenta disparar cron repetidamente
usuário consulta IDs aleatórios
usuário envia payload gigante
upstream envia URL maliciosa
upstream retorna JSON inesperado
upstream fica lento
upstream fica offline
upstream retorna milhões de registros
provider externo tenta abrir popups
um canal possui dados malformados
sincronização falha no meio
```

---

# 44. Rate limiting

Aplicar rate limit em endpoints públicos com maior potencial de abuso.

Prioridade:

```text
/api/search
/api/channels
/api/cron/*
/api/auth/*
```

se autenticação for criada.

Pode utilizar:

- Vercel Firewall/Rate Limiting;
- Upstash;
- outra solução compatível.

Não confiar exclusivamente em rate limit como controle de autorização.

---

# 45. Limites de payload

Definir limites.

Não aceitar JSON arbitrariamente grande.

Evitar armazenar descrições ou metadados com tamanho ilimitado sem necessidade.

Aplicar limites também nos schemas Zod.

---

# 46. Paginação

Nunca retornar banco inteiro indefinidamente.

Definir:

```text
default limit = 24
max limit = 100
```

---

# 47. Timeout upstream

Toda chamada externa deve possuir timeout.

Exemplo:

```text
8 segundos
```

Nenhum request de usuário deve ficar esperando indefinidamente pelo upstream.

---

# 48. Retry

Retry apenas quando apropriado.

Exemplo:

```text
network timeout
502
503
504
```

Evitar retry em:

```text
400
401
403
404
```

Máximo pequeno:

```text
2 retries
```

com backoff.

---

# 49. Circuit breaker / degradação

A aplicação deve funcionar usando dados do Supabase quando upstream estiver indisponível.

Nunca tornar a página principal dependente de resposta síncrona do upstream.

---

# 50. A07:2025 — Authentication Failures

Mesmo que autenticação não exista na primeira versão, a arquitetura deve estar preparada.

---

# 51. Supabase Auth futuro

Ao implementar:

- usar Supabase Auth;
- confirmar email quando apropriado;
- rate limit em login;
- proteção contra enumeração;
- sessões seguras;
- MFA para administradores;
- recuperação de senha segura.

---

# 52. Admin

Administração futura deve possuir papel explícito.

Nunca implementar:

```typescript
if (email.endsWith("@empresa.com")) admin = true
```

Utilizar claims ou tabela de roles protegida.

---

# 53. Reautenticação

Operações críticas futuras podem exigir sessão recente ou MFA.

Exemplos:

```text
alterar configuração de segurança
rotacionar integration secret
forçar sincronização administrativa
gerenciar usuários
```

---

# 54. Cookies

Quando utilizados:

```text
Secure
HttpOnly
SameSite
```

de acordo com a arquitetura de autenticação.

Nunca guardar access token sensível manualmente em localStorage se a solução oficial escolhida oferece alternativa mais segura.

---

# 55. Enumeração de usuário

Mensagens futuras de login não devem revelar desnecessariamente:

```text
"email existe"
"email não existe"
```

Preferir respostas genéricas quando apropriado.

---

# 56. A08:2025 — Software or Data Integrity Failures

Proteger:

```text
sincronização
dados recebidos
deploy
build
cron
migrations
configuração
```

---

# 57. Validação upstream

A resposta upstream deve passar por:

```text
Zod
```

Nunca inserir JSON diretamente no Supabase sem validação.

---

# 58. Processamento individual

Um registro inválido não deve obrigatoriamente destruir toda a sincronização.

Fluxo sugerido:

```text
response
  ↓
validar envelope
  ↓
para cada registro
  ├── válido → processar
  └── inválido → registrar erro sanitizado
```

Definir limite de erros.

Se o percentual de registros inválidos ultrapassar limite razoável, abortar a sincronização para evitar corrupção massiva.

---

# 59. Mudança inesperada do schema

Detectar alterações como:

```text
data deixou de ser array
total incompatível
id ausente
embeds mudou de tipo
timestamps inválidos
```

Nesses casos:

```text
não apagar dados existentes
não marcar tudo como inativo
registrar sync como failed/partial
```

---

# 60. Integridade na desativação

Nunca fazer:

```text
upstream falhou
→ resultado vazio
→ marcar todos os canais inactive
```

Somente executar fase de desativação se:

```text
fetch bem-sucedido
envelope válido
quantidade plausível
processamento atingiu nível aceitável
```

---

# 61. Threshold de segurança

Implementar proteção contra queda abrupta.

Exemplo:

```text
última sync = 110 canais
nova sync = 3 canais
```

Não assumir automaticamente que 107 canais foram removidos.

Marcar sincronização como:

```text
suspicious
partial
```

e preservar dados anteriores.

Threshold deve ser configurável.

---

# 62. Migrations

Migrations devem:

- estar no Git;
- ser revisáveis;
- evitar destruição automática;
- ter backup/rollback planejado quando alteração for crítica.

Não executar SQL arbitrário vindo de fonte externa.

---

# 63. Deploy

Somente código versionado deve ir para produção.

Evitar deploy manual de arquivos não rastreados.

Branch protegida recomendada:

```text
main
```

Com:

- pull request;
- CI;
- revisão;
- checks obrigatórios.

---

# 64. A09:2025 — Security Logging and Alerting Failures

Logs devem ser estruturados.

Eventos mínimos:

```text
sync_started
sync_completed
sync_failed
upstream_unavailable
upstream_schema_invalid
cron_auth_failed
rate_limit_triggered
admin_action
database_error
```

---

# 65. Dados proibidos em logs

Nunca registrar:

```text
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
Authorization header
cookies de sessão
refresh token
access token
password
connection string
```

---

# 66. Redação

Criar redactor central.

Exemplo conceitual:

```typescript
const SENSITIVE_KEYS = [
  "authorization",
  "cookie",
  "password",
  "token",
  "secret",
  "apiKey"
]
```

Não depender exclusivamente dessa lista.

---

# 67. Correlação

Gerar/request ID quando útil.

Exemplo:

```text
request_id
sync_id
```

Permite correlacionar eventos sem expor dados sensíveis.

---

# 68. Alertas

Alertar quando:

```text
várias sincronizações falharem
cron começar a retornar 401 repetidamente
taxa de 5xx aumentar
upstream ficar indisponível
schema upstream mudar
banco ficar indisponível
```

Ferramentas possíveis:

```text
Vercel Observability
Sentry
Supabase Logs
serviço externo
```

Não é obrigatório usar todos.

---

# 69. Retenção de logs

Definir retenção.

Não manter logs indefinidamente sem motivo.

Separar:

```text
logs operacionais
logs de segurança
logs de auditoria
```

---

# 70. A10:2025 — Mishandling of Exceptional Conditions

Falhas devem ser previstas.

Exemplos:

```text
timeout
DNS failure
invalid JSON
500 upstream
rate limit upstream
database timeout
unique constraint
partial transaction
invalid timestamp
empty dataset
duplicate IDs
embed host inesperado
```

---

# 71. Fail safely

Em falhas:

```text
não liberar acesso
não revelar segredo
não apagar dados válidos
não retornar stack trace
não assumir sucesso
```

---

# 72. Transações

Operações logicamente atômicas devem utilizar transação quando apropriado.

Especialmente ao sincronizar entidades relacionadas.

Se não for possível fazer toda sincronização em uma única transação por escala, criar uma estratégia que impeça estado corrupto.

---

# 73. Estado da sincronização

Usar identificador de execução.

Exemplo:

```text
sync_run_id
```

Registrar:

```text
started
received
validated
persisted
completed
failed
```

---

# 74. Concorrência

Evitar duas sync simultâneas.

Usar:

```text
PostgreSQL advisory lock
```

ou mecanismo equivalente.

Se lock já existir:

```text
não iniciar segunda execução
```

---

# 75. Exceções

Não usar:

```typescript
catch {
  return null
}
```

indiscriminadamente.

Exceções devem:

1. ser classificadas;
2. ser registradas de forma sanitizada;
3. resultar em resposta apropriada;
4. preservar estado consistente.

---

# 76. Error responses

Criar padrão:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Requisição inválida."
  }
}
```

Não responder ao cliente:

```json
{
  "error": "Postgres error at /var/task/node_modules/... password=..."
}
```

---

# 77. HTTP status

Utilizar corretamente:

```text
400 invalid input
401 unauthenticated
403 unauthorized
404 not found
409 conflict
422 semantic validation
429 rate limited
500 unexpected internal error
502 upstream invalid
503 temporary unavailable
```

---

# 78. Segurança da API upstream

Centralizar comunicação em:

```text
lib/upstream/
```

Nenhum componente React deve fazer fetch diretamente para upstream.

---

# 79. Allowlist de hosts upstream

Configuração:

```env
UPSTREAM_API_URL=https://api.reidoscanais.st
```

Em produção, validar a URL configurada na inicialização.

Exigir:

```text
https:
hostname esperado
```

Evitar que uma variável comprometida seja transformada em acesso arbitrário à rede interna.

---

# 80. Redirects

Ao fazer fetch sensível externo, avaliar desabilitar redirects automáticos ou validar o destino final.

Nunca permitir que host confiável redirecione silenciosamente para:

```text
localhost
metadata service
IP privado
host não autorizado
```

---

# 81. Dados de imagem

`logo_url` e imagens de EPG também são input externo.

Se utilizadas com `next/image`:

- allowlist por hostname;
- evitar wildcard amplo;
- validar protocolo;
- usar fallback.

---

# 82. Segurança específica dos embeds

Os embeds representam uma fronteira de confiança separada.

Nunca considerar conteúdo do iframe como parte confiável da aplicação.

---

# 83. Feature flag

Manter:

```env
NEXT_PUBLIC_ENABLE_EXTERNAL_EMBEDS=false
```

em novos ambientes.

Ativação deve ser decisão consciente.

---

# 84. Provider selector

O usuário não pode enviar uma URL arbitrária ao player.

Fluxo correto:

```text
channel id
   ↓
backend/database
   ↓
embed permitido
   ↓
player
```

Nunca:

```text
?embed=https://url-fornecida-pelo-usuario
```

---

# 85. iframe sandbox

Começar com sandbox restritivo.

Adicionar capacidades individualmente somente se necessárias.

Não utilizar por padrão:

```text
allow-same-origin
allow-top-navigation
allow-popups
allow-popups-to-escape-sandbox
```

sem necessidade comprovada.

Alguns players podem exigir permissões adicionais. Qualquer relaxamento deve ser documentado.

---

# 86. Navegação externa

Links externos abertos em nova aba devem usar:

```html
rel="noopener noreferrer"
```

quando aplicável.

---

# 87. Banco de dados

Além de RLS:

- constraints;
- foreign keys;
- unique indexes;
- tipos adequados;
- tamanhos razoáveis;
- timestamps;
- integridade referencial.

Segurança também depende da consistência do dado.

---

# 88. Funções SECURITY DEFINER

Evitar quando possível.

Se necessárias no Supabase/Postgres:

- revisar rigorosamente;
- fixar `search_path`;
- limitar `EXECUTE`;
- não aceitar SQL dinâmico inseguro.

Exemplo de preocupação:

```text
SECURITY DEFINER + search_path controlável
```

pode resultar em escalada de privilégio.

---

# 89. Storage Supabase

Se utilizar Storage futuramente:

- bucket privado por padrão;
- policies específicas;
- limite de tamanho;
- MIME allowlist;
- nome de arquivo controlado;
- não confiar apenas na extensão.

---

# 90. Segurança do frontend

Nunca considerar ocultação visual como autorização.

Isto:

```typescript
{isAdmin && <AdminButton />}
```

não protege endpoint.

Backend deve verificar autorização independentemente.

---

# 91. Variáveis NEXT_PUBLIC

Qualquer variável:

```text
NEXT_PUBLIC_*
```

deve ser considerada pública.

Nunca armazenar segredo nela.

Permitidos:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
feature flags não sensíveis
```

Proibidos:

```text
NEXT_PUBLIC_SERVICE_ROLE_KEY
NEXT_PUBLIC_CRON_SECRET
NEXT_PUBLIC_DATABASE_PASSWORD
```

---

# 92. `.gitignore`

Obrigatório conter:

```text
.env
.env.local
.env.*.local
.vercel
```

Não ignorar:

```text
.env.example
```

---

# 93. `.env.example`

Nunca inserir valores reais.

Exemplo:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

UPSTREAM_API_URL=https://api.reidoscanais.st
CRON_SECRET=

NEXT_PUBLIC_ENABLE_EXTERNAL_EMBEDS=false
```

---

# 94. Proteção contra brute force e automação

Quando autenticação existir:

- rate limiting;
- MFA administrativo;
- backoff;
- proteção do provedor;
- alertas de tentativa suspeita.

Não implementar CAPTCHA por padrão se não houver necessidade.

---

# 95. API responses

Evitar entregar dados internos não necessários.

Exemplo de channel público:

```json
{
  "id": "...",
  "name": "...",
  "category": "...",
  "logoUrl": "...",
  "epg": {}
}
```

Não retornar junto:

```text
internal database ids
sync metadata
last error
admin flags
raw upstream response
```

sem necessidade.

---

# 96. Mass assignment

Nunca fazer:

```typescript
supabase
  .from("channels")
  .update(await request.json())
```

Criar objeto explicitamente:

```typescript
const update = {
  name: input.name,
  category: input.category
}
```

---

# 97. Cache

Não cachear respostas contendo secrets ou dados privados.

Ao adicionar autenticação futura, separar cache público e privado.

Cuidado com:

```text
Next.js full route cache
CDN
Vercel Edge Cache
```

---

# 98. CSRF

Route Handlers que alteram estado e utilizam autenticação baseada em cookie devem possuir estratégia contra CSRF.

Possíveis controles:

- SameSite;
- verificação de Origin;
- token CSRF quando necessário;
- não aceitar mutação via GET.

Nunca utilizar GET para operação destrutiva.

---

# 99. Métodos HTTP

Exemplo:

```text
GET    leitura
POST   ação/criação
PATCH  atualização parcial
DELETE remoção
```

Não executar:

```text
GET /api/delete-user
GET /api/force-sync
```

---

# 100. Uploads futuros

Se uploads forem adicionados:

- limite de bytes;
- MIME allowlist;
- nome aleatório;
- armazenamento fora do filesystem da aplicação;
- scanner quando risco justificar;
- não executar arquivo;
- não confiar na extensão.

---

# 101. Segurança da Vercel

Configurar ambientes separados:

```text
Development
Preview
Production
```

Secrets de produção não devem ser automaticamente reutilizados em previews se não forem necessários.

Revisar quem possui acesso à organização/projeto.

Ativar MFA nas contas administrativas.

---

# 102. Segurança Supabase

Revisar periodicamente:

```text
RLS
API keys
Auth settings
Storage policies
Database roles
extensions
network restrictions disponíveis
logs
```

Não permitir acesso anônimo de escrita sem necessidade.

---

# 103. Segurança GitHub

Recomendado:

```text
MFA
branch protection
required pull request
required CI
secret scanning
Dependabot
CodeQL
```

CodeQL é recomendado para análise estática adicional.

---

# 104. CI de segurança

Criar workflow de segurança.

Pipeline mínimo:

```text
npm ci
npm run lint
npm run typecheck
npm test
npm audit
npm run build
```

Adicionar quando possível:

```text
CodeQL
Gitleaks
OSV Scanner
```

---

# 105. Exemplo de quality gate

Pull request não deve ser mergeado se houver:

```text
lint failure
typecheck failure
test failure
build failure
secret detectado
vulnerabilidade crítica confirmada
```

Vulnerabilidade alta deve ser triada antes de merge.

---

# 106. SAST

Utilizar ao menos uma solução:

```text
CodeQL
Semgrep
```

Não considerar SAST substituto de revisão.

---

# 107. Testes de segurança automatizados

Criar testes para:

## Input validation

```text
page=-1
limit=1000000
q com 10.000 caracteres
id inválido
URL javascript:
URL file:
```

Devem ser rejeitados.

---

## Cron

Testar:

```text
sem Authorization → 401
token inválido → 401
token válido → execução permitida
GET → 405
```

---

## RLS

Testar que cliente anon:

```text
consegue SELECT permitido
não consegue INSERT
não consegue UPDATE
não consegue DELETE
```

---

## Upstream

Testar:

```text
timeout
invalid JSON
schema inválido
array vazio inesperado
queda abrupta de quantidade
registro inválido
500
503
```

---

## XSS

Fixtures devem incluir strings como:

```html
<script>alert(1)</script>
<img src=x onerror=alert(1)>
```

A interface deve exibi-las como texto ou rejeitá-las, nunca executá-las.

---

# 108. Testes de autorização

Quando autenticação existir, para cada endpoint protegido testar:

```text
anonymous
authenticated normal
admin
token expired
token malformed
```

---

# 109. Security regression tests

Todo bug de segurança corrigido deve ganhar teste de regressão quando possível.

Princípio:

```text
security bug
  ↓
fix
  ↓
automated regression test
```

---

# 110. DoS e consumo de recursos

Limitar:

```text
pagination
search length
payload size
concurrent sync
external fetch timeout
retry count
```

Evitar operações O(n²) com entrada controlada pelo cliente.

---

# 111. Sincronização segura

Fluxo recomendado:

```text
acquire lock
    ↓
create sync_log
    ↓
fetch upstream with timeout
    ↓
validate envelope
    ↓
sanity checks
    ↓
validate records
    ↓
upsert valid channels
    ↓
sync embeds
    ↓
sync EPG
    ↓
mark missing only if sync trusted
    ↓
finish sync_log
    ↓
release lock
```

---

# 112. Sanity checks

Antes de considerar uma sync confiável:

- `success === true`;
- `data` é array;
- quantidade está dentro de faixa plausível;
- IDs não estão massivamente ausentes;
- taxa de erro individual abaixo do threshold;
- resposta não parece página HTML/CDN de erro.

---

# 113. Conteúdo HTTP inesperado

Verificar:

```text
Content-Type
```

Não presumir JSON.

Se servidor retornar:

```text
text/html
```

não tentar persistir como resposta válida.

---

# 114. Timestamps

Validar Unix timestamps.

Impedir:

```text
NaN
Infinity
data impossível
end < start
```

Decidir limites razoáveis para EPG.

---

# 115. Duplicatas

Se upstream retornar IDs duplicados:

- detectar;
- registrar;
- não sobrescrever silenciosamente em ordem imprevisível;
- considerar execução parcial/inválida conforme volume.

---

# 116. Observabilidade da sync

Registrar:

```text
sync_id
duration
received
valid
invalid
created
updated
deactivated
upstream_status
```

Não registrar payload completo desnecessariamente.

---

# 117. Privacidade

A primeira versão não deve coletar analytics invasivos sem necessidade.

Se analytics forem adicionados:

- documentar;
- minimizar dados;
- evitar dados pessoais em eventos;
- respeitar requisitos legais aplicáveis.

---

# 118. Security.txt

Quando houver domínio definitivo, considerar:

```text
/.well-known/security.txt
```

com canal apropriado para reporte de vulnerabilidades.

Não publicar email inexistente.

---

# 119. Backup e recuperação

Configurar estratégia de backup compatível com importância do projeto.

Antes de migration destrutiva:

```text
backup
```

Testar restauração periodicamente se o ambiente se tornar crítico.

---

# 120. Princípio de não destruição

Scripts automáticos jamais devem:

```text
DROP TABLE
TRUNCATE
DELETE all
```

em produção sem salvaguardas explícitas.

Seeds não devem rodar automaticamente sobre produção.

---

# 121. Ambientes

Separar:

```text
local
preview
production
```

Preferencialmente usar projetos Supabase separados entre desenvolvimento e produção quando o projeto amadurecer.

---

# 122. Dados de teste

Não copiar dados pessoais reais para ambiente de desenvolvimento sem necessidade.

---

# 123. Error monitoring

Se utilizar Sentry ou equivalente:

configurar redaction.

Não enviar automaticamente:

```text
cookies
Authorization
tokens
secrets
```

---

# 124. Validação de configuração no startup

Criar schema para env.

Exemplo conceitual:

```typescript
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  UPSTREAM_API_URL: z.string().url(),
  CRON_SECRET: z.string().min(32)
})
```

Falhar no startup/build quando configuração obrigatória estiver ausente.

---

# 125. `server-only`

Adicionar:

```typescript
import "server-only"
```

em módulos contendo:

```text
service role
cron internals
admin repositories
secret-bearing config
```

---

# 126. Client Components

Revisar qualquer arquivo contendo:

```typescript
"use client"
```

Nada importado por ele pode depender de secret.

---

# 127. Middleware

Não colocar lógica de autorização crítica somente no middleware.

Middleware pode ser primeira barreira, mas Route Handler/Server Action também deve verificar autorização.

---

# 128. Server Actions

Quando usadas:

- validar input;
- autenticar;
- autorizar;
- não confiar em campos hidden;
- não expor erro interno.

---

# 129. Open redirects

Nunca redirecionar diretamente para:

```text
?next=<input>
```

sem validação.

Se houver redirect após login:

permitir apenas caminhos locais ou allowlist.

---

# 130. Host header

Não construir URLs de segurança críticas confiando cegamente em `Host`.

Preferir variável:

```env
NEXT_PUBLIC_APP_URL=
```

validada.

---

# 131. Webhooks futuros

Quando webhooks forem adicionados:

- validar assinatura;
- validar timestamp;
- replay protection;
- HTTPS;
- idempotência.

---

# 132. Idempotência

Operações repetíveis como sincronização devem ser idempotentes sempre que possível.

Executar o mesmo payload duas vezes não deve duplicar:

```text
channels
embeds
EPG
```

---

# 133. Secrets rotation runbook

Documentar procedimento:

1. gerar novo secret;
2. atualizar destino;
3. atualizar Vercel;
4. redeploy;
5. validar;
6. revogar segredo antigo;
7. verificar logs.

---

# 134. Incidente

Se segredo for exposto:

1. considerar comprometido;
2. revogar imediatamente;
3. gerar novo;
4. revisar logs;
5. procurar uso indevido;
6. remover do histórico Git quando apropriado;
7. invalidar sessões/tokens relacionados;
8. registrar incidente.

Nunca apenas apagar a linha do commit atual e continuar usando a mesma credencial.

---

# 135. Checklist OWASP A01

- [ ] RLS habilitado
- [ ] anon sem escrita administrativa
- [ ] Service Role apenas server-side
- [ ] cron autenticado
- [ ] admin protegido
- [ ] nenhum proxy aberto
- [ ] SSRF mitigado
- [ ] autorização validada no servidor

---

# 136. Checklist OWASP A02

- [ ] headers de segurança
- [ ] CSP
- [ ] CORS restritivo
- [ ] produção sem debug
- [ ] `.env` protegido
- [ ] buckets revisados
- [ ] source/configuration exposure revisada
- [ ] feature de embeds desabilitada por padrão

---

# 137. Checklist OWASP A03

- [ ] lockfile versionado
- [ ] `npm ci`
- [ ] Dependabot/Renovate
- [ ] audit de dependências
- [ ] secret scanning
- [ ] Actions revisadas
- [ ] dependências mínimas
- [ ] vulnerabilidades críticas bloqueiam release

---

# 138. Checklist OWASP A04

- [ ] HTTPS
- [ ] nenhum algoritmo criptográfico próprio
- [ ] secrets fortes
- [ ] secrets na plataforma
- [ ] rotação documentada
- [ ] nenhuma senha em tabela própria

---

# 139. Checklist OWASP A05

- [ ] Zod em inputs
- [ ] queries parametrizadas
- [ ] sem SQL concat
- [ ] sem `dangerouslySetInnerHTML`
- [ ] URL validation
- [ ] sem execução de shell com input
- [ ] limites de tamanho

---

# 140. Checklist OWASP A06

- [ ] threat model
- [ ] abuse cases
- [ ] rate limit
- [ ] paginação
- [ ] timeout
- [ ] retries limitados
- [ ] fallback Supabase
- [ ] deny by default

---

# 141. Checklist OWASP A07

- [ ] Supabase Auth quando necessário
- [ ] MFA administrativo
- [ ] sessão segura
- [ ] proteção contra brute force
- [ ] roles explícitas
- [ ] sem enumeração desnecessária

---

# 142. Checklist OWASP A08

- [ ] schema upstream validado
- [ ] sync possui sanity check
- [ ] lockfile
- [ ] CI protegido
- [ ] migrations versionadas
- [ ] queda brusca de registros não remove dados
- [ ] mudanças de schema não corrompem banco

---

# 143. Checklist OWASP A09

- [ ] eventos de segurança registrados
- [ ] secrets redigidos
- [ ] request/sync id
- [ ] alertas para falhas repetidas
- [ ] retenção definida
- [ ] auditoria administrativa futura

---

# 144. Checklist OWASP A10

- [ ] exceptions tratadas
- [ ] timeout
- [ ] transações
- [ ] lock de sync
- [ ] erro não revela internals
- [ ] falha não apaga dados válidos
- [ ] status HTTP coerente
- [ ] partial sync identificado

---

# 145. Definition of Done de segurança

Uma feature não está pronta se:

```text
funciona
```

mas não:

```text
valida
autoriza
trata erros
possui limites
protege secrets
possui teste
```

---

# 146. Requisitos obrigatórios antes do primeiro deploy

Antes do primeiro deploy em produção:

- [ ] `.env` não está no Git;
- [ ] Service Role não está no bundle;
- [ ] RLS revisado;
- [ ] políticas testadas;
- [ ] CSP configurada;
- [ ] security headers ativos;
- [ ] cron protegido;
- [ ] rate limiting configurado onde necessário;
- [ ] Zod em APIs;
- [ ] URLs externas validadas;
- [ ] embeds externos desabilitados por padrão;
- [ ] `npm audit` revisado;
- [ ] Dependabot configurado;
- [ ] secret scanning habilitado;
- [ ] logs não contêm secrets;
- [ ] build sem warnings críticos;
- [ ] testes de segurança passam;
- [ ] upstream offline não derruba o site;
- [ ] sync inválida não desativa todos os canais.

---

# 147. Comandos de validação

Antes do deploy:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

Se ferramentas extras existirem:

```bash
gitleaks detect
osv-scanner .
```

---

# 148. Arquivos esperados

O projeto deve possuir:

```text
SECURITY.md
.env.example
.gitignore

lib/
├── env.ts
├── logger.ts
├── security/
│   ├── urls.ts
│   ├── rate-limit.ts
│   ├── headers.ts
│   └── redact.ts
│
└── supabase/
    ├── browser.ts
    ├── server.ts
    └── admin.ts

supabase/
└── migrations/
    └── ..._rls.sql

.github/
├── dependabot.yml
└── workflows/
    ├── ci.yml
    └── codeql.yml
```

A estrutura pode ser ajustada, mas responsabilidades devem permanecer separadas.

---

# 149. Fase de hardening

Após aplicação funcional, executar uma fase específica de hardening.

Revisar:

```text
OWASP Top 10
RLS
API routes
headers
CSP
dependencies
secrets
logging
rate limits
upstream validation
cron
error handling
```

---

# 150. Instruções para Claude Code / Codex

Ao trabalhar neste projeto:

1. leia `PROJECT.md`;
2. leia `SECURITY.md`;
3. identifique quais requisitos de segurança afetam a tarefa;
4. não reduza controles para simplificar implementação;
5. não desative RLS para "fazer funcionar";
6. não use Service Role no cliente;
7. não utilize `any` para contornar validação;
8. não ignore erros upstream;
9. não implemente proxy genérico;
10. não exponha secrets;
11. não renderize HTML externo sem sanitização;
12. não permita iframe arbitrário;
13. não faça mutação via GET;
14. não introduza dependência sem necessidade;
15. adicione testes para controles críticos;
16. execute lint/typecheck/test/build;
17. revise dependências;
18. documente qualquer exceção de segurança.

---

# 151. Regra para solicitações conflitantes

Se uma tarefa futura pedir algo como:

```text
desative RLS
exponha Service Role
aceite qualquer URL
ignore validação
use dangerouslySetInnerHTML
coloque secret no frontend
desative CSP
crie proxy aberto
ignore erro para continuar
```

o agente deve:

1. não implementar diretamente;
2. explicar o risco;
3. oferecer alternativa segura;
4. preservar os controles deste documento.

---

# 152. Revisão obrigatória de código

Antes de concluir feature sensível, responder internamente:

```text
Há input controlado pelo usuário?
Há autorização?
Há segredo?
Há chamada externa?
Há escrita no banco?
Há iframe?
Há URL externa?
Há novo pacote?
Há novo endpoint?
Há condição excepcional não tratada?
```

Se qualquer resposta for sim, revisar este `SECURITY.md`.

---

# 153. Prioridades

Classificar vulnerabilidades:

## P0 — Crítica

Exemplos:

```text
Service Role exposta
RCE
SQL injection
auth bypass administrativo
secret público com acesso privilegiado
SSRF para rede interna
```

Bloquear deploy.

---

## P1 — Alta

Exemplos:

```text
RLS incorreta
IDOR
stored XSS
cron público
vulnerabilidade crítica de dependência explorável
```

Bloquear release até correção ou mitigação formal.

---

## P2 — Média

Exemplos:

```text
headers incompletos
rate limit ausente em endpoint de abuso
logging insuficiente
```

Corrigir prioritariamente.

---

## P3 — Baixa

Hardening e melhorias sem exploração significativa imediata.

---

# 154. Relatório de segurança do agente

Quando solicitado a executar auditoria, produzir:

```text
Finding ID
OWASP category
Severity
Affected component
Description
Attack scenario
Evidence
Recommended remediation
Status
```

Exemplo:

```text
SEC-001
A01:2025 Broken Access Control
HIGH
/api/cron/sync-channels

Endpoint permite execução sem autenticação.

Remediação:
exigir Authorization Bearer com secret server-side,
rate limiting e teste automatizado.
```

---

# 155. Regra final

O objetivo não é apenas:

```text
passar no OWASP Top 10
```

O objetivo é construir uma aplicação cuja arquitetura torne vulnerabilidades comuns mais difíceis de introduzir.

A segurança deve permanecer:

```text
versionada
testável
auditável
repetível
automatizada
```

e deve evoluir junto com o projeto.

---

# Referências

OWASP Top 10:2025:

```text
https://top10.owasp.org/2025/
```

Projeto OWASP Top 10:

```text
https://owasp.org/projects/top-ten/
```

OWASP Cheat Sheet Series:

```text
https://cheatsheetseries.owasp.org/
```

OWASP ASVS:

```text
https://owasp.org/www-project-application-security-verification-standard/
```
