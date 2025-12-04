import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

export const metadata: Metadata = {
    metadataBase: new URL('https://zahlenlotto.vercel.app'),
    title: "Zahlenlotto - Number Drawing & Card Generation",
    description: "Number Drawing & Card Generation for lottery games",
    keywords: ["lotto", "lottery", "number drawing", "card generation"],
    authors: [{ name: "Zahlenlotto" }],
    // OpenGraph metadata
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "https://zahlenlotto.vercel.app",
        siteName: "Zahlenlotto",
        title: "Zahlenlotto - Number Drawing & Card Generation",
        description: "Number Drawing & Card Generation for lottery games",
    },
    // Twitter Card metadata
    twitter: {
        card: "summary_large_image",
        title: "Zahlenlotto - Number Drawing & Card Generation",
        description: "Number Drawing & Card Generation for lottery games",
    },
    // Performance optimizations
    other: {
        'color-scheme': 'dark light',
    },
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
        <html lang="en">
            <body className="antialiased">
                <ThemeProvider>
                    <LanguageProvider>
                        {children}
                    </LanguageProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
