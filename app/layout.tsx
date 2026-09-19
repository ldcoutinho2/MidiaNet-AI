import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MidiaNet AI — Estratégia para Instagram",
  description: "Conecte seu Instagram, conte onde quer chegar e receba uma estratégia baseada nos seus dados."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}