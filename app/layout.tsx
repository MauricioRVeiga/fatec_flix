import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { Suspense } from "react";

import { HeaderContainer } from "@/components/layout/header-container";
import { HeaderFallback } from "@/components/layout/header";

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
        <Suspense fallback={<HeaderFallback />}>
          <HeaderContainer />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
