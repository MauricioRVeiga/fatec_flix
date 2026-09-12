import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { Suspense } from "react";

import { Header } from "@/components/layout/header";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fatec Flix",
  description:
    "Catálogo de canais de TV com programação atual, próximos programas, categorias e busca.",
};

// Aplica o tema salvo antes da hidratação, para não piscar entre
// claro/escuro (PROJECT.md §31/§64 — visual escuro por padrão).
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("fatec-flix:theme");
    var theme = stored === "light" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Nonce gerado pelo middleware (PROJECT.md §56) — necessário para
  // este script inline passar pela CSP sem precisar de
  // 'unsafe-inline' (que anularia a proteção contra XSS da CSP).
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Suspense fallback={<div className="h-16 border-b border-border/60" />}>
          <Header />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
