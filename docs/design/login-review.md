# Login — remodelagem visual

Direção: visual cinematográfico inspirado em plataformas de streaming, com identidade Fatec Flix em vermelho, pôsteres originais, fundo escuro e formulário em destaque. Escopo desta etapa: tela de login existente. Filmes e séries sob demanda são apresentados como futuros recursos.

## Verificação em 15/09/2026

- Layout inspecionado no navegador em 320 × 740, 390 × 844, 768 × 1024 e 1440 × 900; sem transbordamento horizontal.
- Campos obrigatórios, mostrar/ocultar senha, ajuda expansível, estado pendente e erro de credenciais verificados no navegador.
- Login real validado, com redirecionamento ao catálogo e header funcionando; saída da sessão retorna ao login.
- Contraste das bordas dos campos aumentado para 3,71:1 em relação ao preenchimento. Foco visível, labels, autocomplete, alerta acessível e preferência por movimento reduzido presentes.
- Imagem decorativa local otimizada em WebP e carregada antes do login. Prompt e procedência em `login-image-prompt.md`.
- Build de produção e verificação TypeScript passaram.
- 128 testes passaram em 16 arquivos, incluindo regressões de autorização e matcher da imagem.
- Lint sem erros; dois avisos preexistentes de parâmetros não utilizados em `app/admin/actions.ts`.

## Ajustes de integração

- Comparação de ADMIN_EMAIL normalizada para aceitar a capitalização fornecida e o e-mail normalizado pelo Supabase, preservando a restrição à mesma conta.
- Consulta ao catálogo e faixa de carregamento do header omitidas no login; componente client do header mantido para acompanhar navegação.
- Exclusão exata da imagem pública no matcher; demais rotas continuam protegidas.

## Observação fora do escopo visual

Durante a conferência de saída pelo painel administrativo, o endpoint `/health` da API upstream respondeu 503. O login e o catálogo persistido no Supabase funcionaram. Nenhuma sincronização foi disparada.
