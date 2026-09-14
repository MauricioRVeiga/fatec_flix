/**
 * Esconde overlays do tipo "desative seu bloqueador de anúncios"
 * (best-effort, baseado em texto — não em seletores CSS específicos
 * de um site, já que não temos como inspecionar o DOM de terceiros
 * de antemão). Roda em todos os frames, inclusive iframes de outra
 * origem, porque a extensão tem essa permissão concedida pelo
 * próprio navegador — diferente de JS de página comum.
 *
 * Frases incluídas: genéricas (comuns em qualquer site com esse tipo
 * de aviso) + a mensagem exata relatada pelo usuário do projeto
 * ("Acesso Bloqueado" / "remova o atributo sandbox").
 */
(function () {
  const NAG_PHRASES = [
    "desative seu bloqueador",
    "disable your ad blocker",
    "disable adblock",
    "adblock detected",
    "please disable your ad",
    "acesso bloqueado",
    "remova o atributo sandbox",
    "remove the sandbox attribute",
    "desative o adblock",
  ];

  function textMatchesNag(text) {
    const lower = text.toLowerCase();
    return NAG_PHRASES.some((phrase) => lower.includes(phrase));
  }

  function hideNagElements(root) {
    let candidates;
    try {
      candidates = root.querySelectorAll("div, section, aside, p, span, h1, h2");
    } catch {
      return;
    }

    for (const el of candidates) {
      const text = el.textContent || "";
      // Textos muito longos provavelmente são conteúdo real da página,
      // não um aviso pontual — evita esconder coisa demais.
      if (text.length === 0 || text.length > 600) continue;
      if (!textMatchesNag(text)) continue;

      // Sobe alguns níveis pra tentar pegar o container do aviso
      // inteiro (overlay), não só o parágrafo com o texto.
      let target = el;
      for (let i = 0; i < 3 && target.parentElement; i++) {
        target = target.parentElement;
      }
      target.style.setProperty("display", "none", "important");
    }
  }

  const observer = new MutationObserver(() => hideNagElements(document));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  hideNagElements(document);
})();
