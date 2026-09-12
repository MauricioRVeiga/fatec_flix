import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Bloqueador de anúncios — Fatec Flix",
  description:
    "Instale a extensão opcional que reduz anúncios/popups dos servidores externos de vídeo.",
};

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
        {n}
      </span>
      <span className="text-sm text-foreground">{children}</span>
    </li>
  );
}

export default function ExtensionPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary">
          <ShieldAlert className="size-5" aria-hidden="true" />
          <span className="text-sm font-medium">Experimental · opcional</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Bloqueador de anúncios</h1>
        <p className="text-muted-foreground">
          Os servidores de vídeo dos canais são fornecidos por terceiros e podem exibir
          anúncios ou avisos próprios. Esta extensão de navegador opcional bloqueia
          domínios de anúncio conhecidos e esconde avisos do tipo &ldquo;desative seu
          bloqueador&rdquo;. Ela roda só no seu navegador, depois que você instala — o
          Fatec Flix não modifica nem redistribui o conteúdo de nenhum servidor externo.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-5">
        <h2 className="font-semibold">No celular? Isso aqui não instala</h2>
        <p className="text-sm text-muted-foreground">
          Android (Chrome) não permite instalar extensão customizada, e no iOS isso
          exigiria um app nativo publicado na App Store. Em vez da extensão, use um
          navegador mobile com bloqueio de anúncio nativo, como o{" "}
          <a
            href="https://brave.com/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2"
          >
            Brave
          </a>{" "}
          (Android e iOS).
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border/60 p-5">
        <h2 className="font-semibold">Chrome, Edge ou Brave (desktop)</h2>
        <ol className="flex flex-col gap-3">
          <Step n={1}>
            Baixe o código-fonte do projeto (pasta <code>extension/</code>).
          </Step>
          <Step n={2}>
            Acesse <code>chrome://extensions</code> (ou <code>edge://extensions</code>).
          </Step>
          <Step n={3}>Ative o &ldquo;Modo do desenvolvedor&rdquo;.</Step>
          <Step n={4}>
            Clique em &ldquo;Carregar sem compactação&rdquo; e selecione a pasta{" "}
            <code>extension/</code>.
          </Step>
        </ol>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border/60 p-5">
        <h2 className="font-semibold">Firefox</h2>
        <ol className="flex flex-col gap-3">
          <Step n={1}>
            Acesse <code>about:debugging#/runtime/this-firefox</code>.
          </Step>
          <Step n={2}>Clique em &ldquo;Carregar extensão temporária…&rdquo;.</Step>
          <Step n={3}>
            Selecione o arquivo <code>extension/manifest.json</code>.
          </Step>
        </ol>
        <p className="text-xs text-muted-foreground">
          No Firefox esse carregamento é temporário — some ao fechar o navegador.
        </p>
      </section>

      <p className="text-xs text-muted-foreground">
        As regras de bloqueio são genéricas e públicas, não testadas contra cada
        servidor específico — podem não cobrir tudo. Detalhes completos em{" "}
        <code>extension/README.md</code> no repositório do projeto.
      </p>
    </main>
  );
}
