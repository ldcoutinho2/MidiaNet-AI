import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MidiaNet AI — Sua semana de posts pronta em 5 minutos",
  description: "Analise seu Instagram, descubra o que corrigir e receba uma semana de conteúdo pronta para copiar e postar.",
  openGraph: {
    title: "MidiaNet AI — Sua semana de posts pronta em 5 minutos",
    description: "Diagnóstico do Instagram + estratégia + semana de conteúdo pronta. Teste grátis por 2 dias.",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "MidiaNet AI — Sua semana de posts pronta em 5 minutos" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "MidiaNet AI — Sua semana de posts pronta em 5 minutos",
    description: "Diagnóstico do Instagram + semana de conteúdo pronta.",
    images: ["/api/og"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
