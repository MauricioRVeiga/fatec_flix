import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Film, Globe2, Radio } from "lucide-react";
import { Suspense } from "react";

import { LoginForm } from "./login-form";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Entrar | Fatec Flix",
  description: "Seus canais favoritos, em um só lugar. Entre no Fatec Flix e dê play no seu momento.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true">
        <Image
          src="/images/login-cinema.webp"
          alt=""
          fill
          sizes="100vw"
          preload
          className={styles.backdropImage}
        />
      </div>

      <header className={styles.header}>
        <Link href="/login" className={styles.wordmark} aria-label="Fatec Flix — início">
          FATEC<span>FLIX</span>
        </Link>
        <span className={styles.headerNote}>O seu entretenimento. Do seu jeito.</span>
      </header>

      <main className={styles.main}>
        <section className={styles.intro} aria-labelledby="login-intro">
          <p className={styles.eyebrow}><Radio size={15} aria-hidden="true" /> AO VIVO. E MUITO MAIS.</p>
          <h1 id="login-intro" className={styles.headline}>
            Dê play no{" "}<br />seu <span>momento.</span>
          </h1>
          <p className={styles.description}>
            Seus canais favoritos, em um só lugar.<br />
            A próxima boa história começa aqui.
          </p>
          <div className={styles.contentTypes}>
            <span className={styles.liveCategory}><Radio size={18} aria-hidden="true" /> TV ao vivo</span>
            <span className={styles.futureCategory}><Film size={18} aria-hidden="true" /> Filmes e séries <span className={styles.soon}>EM BREVE</span></span>
          </div>
        </section>

        <section className={styles.card} aria-labelledby="login-heading">
          <div className={styles.cardHeading}>
            <p className={styles.cardEyebrow}>SEU LUGAR NA PRIMEIRA FILA</p>
            <h2 id="login-heading">Entrar</h2>
            <p>Bom ter você de volta.</p>
          </div>
          <Suspense fallback={<p className={styles.formLoading} role="status">Preparando seu acesso…</p>}>
            <LoginForm />
          </Suspense>
          <div className={styles.inviteNote}>
            <p>Ainda não tem acesso?</p>
            <span>Peça um convite ao administrador e venha dar o próximo play.</span>
          </div>
          <p className={styles.privateAccess}>Acesso exclusivo para usuários convidados.</p>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} Fatec Flix</span>
        <span className={styles.footerTagline}>Uma pausa. Muitas possibilidades.</span>
        <span className={styles.language}><Globe2 size={15} aria-hidden="true" /> Português (Brasil)</span>
      </footer>
    </div>
  );
}
