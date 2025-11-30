import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zahlenlotto - Zahlen ziehen und Karten generieren",
  description: "Spielen Sie Zahlenlotto online! Ziehen Sie zufällige Zahlen und generieren Sie druckbare Lotto-Karten als PDF.",
  keywords: ["Zahlenlotto", "Lotto", "Bingo", "Zahlen ziehen", "Karten Generator", "PDF"],
  authors: [{ name: "Zahlenlotto" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
