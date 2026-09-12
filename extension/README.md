# Fatec Flix — Bloqueador de Anúncios (experimental)

Extensão de navegador **opcional** para quem usa o Fatec Flix e quer
reduzir anúncios/popups vindos dos servidores externos de vídeo
(PROJECT.md §37). Não faz parte do site em si — precisa ser instalada
manualmente, no seu próprio navegador.

## O que ela faz

- Bloqueia requisições de rede pra uma lista curada de redes de
  anúncio conhecidas e públicas (`rules.json`) — as mesmas que
  aparecem em listas de bloqueio genéricas como a EasyList, não algo
  específico de um site.
- Esconde elementos cujo texto bate com frases comuns de "desative
  seu bloqueador de anúncios" (`hide-nag-banners.js`), incluindo a
  mensagem "Acesso Bloqueado" relatada ao usar um dos servidores.

## O que ela **não** faz

- **Não é instalada automaticamente por quem visita o site.**
  Nenhum site consegue instalar uma extensão no navegador de quem o
  acessa — isso é uma restrição de segurança do próprio navegador,
  não uma limitação nossa. Cada pessoa precisa instalar por conta
  própria, se quiser.
- **Não foi testada contra o site real dos servidores de vídeo.** As
  regras são genéricas/públicas; pode não bloquear tudo, ou nem
  precisar bloquear nada dependendo do servidor escolhido.
- Não modifica, reescreve ou redistribui o conteúdo de nenhum
  terceiro — só muda o que o *seu próprio navegador* escolhe
  carregar/exibir localmente, do mesmo jeito que qualquer bloqueador
  de anúncio comum (uBlock Origin etc.) já faz.
- Não está publicada em nenhuma loja de extensões (Chrome Web
  Store/Firefox Add-ons) — isso exigiria conta de desenvolvedor e
  processo de revisão próprios do dono do projeto.

## Como instalar (modo desenvolvedor)

### Chrome / Edge / Brave

1. Baixe/clone este repositório e localize a pasta `extension/`.
2. Acesse `chrome://extensions` (ou `edge://extensions`).
3. Ative "Modo do desenvolvedor" (canto superior direito).
4. Clique em "Carregar sem compactação" e selecione a pasta
   `extension/`.

### Firefox

1. Acesse `about:debugging#/runtime/this-firefox`.
2. Clique em "Carregar extensão temporária…".
3. Selecione o arquivo `extension/manifest.json`.
4. No Firefox, a extensão some ao fechar o navegador (carregamento
   temporário) — é preciso recarregar a cada sessão, a menos que seja
   assinada e instalada permanentemente.

## Ajustando as regras

Se um servidor específico continuar mostrando anúncios, abra as
ferramentas de desenvolvedor do navegador (aba Rede) enquanto ele
carrega, veja quais domínios estão servindo o anúncio, e adicione uma
entrada nova em `rules.json` seguindo o mesmo formato das existentes.
