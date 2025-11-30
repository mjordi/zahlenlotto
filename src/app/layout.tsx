import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from '@/contexts/LanguageContext';

export const metadata: Metadata = {
    title: "Zahlenlotto - Number Drawing & Card Generation",
    description: "Premium Number Drawing & Card Generation for lottery games",
    keywords: ["lotto", "lottery", "number drawing", "card generation"],
    authors: [{ name: "Zahlenlotto" }],
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    themeColor: "#0f172a",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="de">
            <body className="antialiased">
                <LanguageProvider>
                    {children}
                </LanguageProvider>
            </body>
        </html>
    );
}
