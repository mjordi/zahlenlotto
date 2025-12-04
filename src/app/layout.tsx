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
        locale: "de_DE",
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

import { cookies } from 'next/headers';
import { AppliedTheme, ThemePreference } from '@/contexts/ThemeContext';
import { Language } from '@/utils/translations';

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const themeCookie = cookieStore.get('theme');
    const themePreferenceCookie = cookieStore.get('theme-preference');
    const langCookie = cookieStore.get('language');

    const theme = (themeCookie?.value === 'light' ? 'light' : 'dark') as AppliedTheme;
    const themePreference = (['light', 'dark', 'auto'].includes(themePreferenceCookie?.value || '') ? themePreferenceCookie?.value : 'auto') as ThemePreference;
    const lang = (['de', 'en', 'fr', 'it'].includes(langCookie?.value || '') ? langCookie?.value : 'de') as Language;

    return (
        <html lang={lang} data-theme={theme} data-language={lang} suppressHydrationWarning>
            <body className="antialiased">
                <ThemeProvider initialTheme={theme} initialThemePreference={themePreference}>
                    <LanguageProvider initialLanguage={lang}>
                        {children}
                    </LanguageProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
