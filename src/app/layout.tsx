import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

export const metadata: Metadata = {
    title: "Zahlenlotto - Number Drawing & Card Generation",
    description: "Premium Number Drawing & Card Generation for lottery games",
    keywords: ["lotto", "lottery", "number drawing", "card generation"],
    authors: [{ name: "Zahlenlotto" }],
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
        <html lang="de" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    // Prevent flash of default theme
                                    const themePreference = localStorage.getItem('themePreference');
                                    let appliedTheme = 'dark'; // Default

                                    if (themePreference === 'light') {
                                        appliedTheme = 'light';
                                    } else if (themePreference === 'dark') {
                                        appliedTheme = 'dark';
                                    } else if (themePreference === 'auto') {
                                        // Check system preference
                                        appliedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                                    }

                                    document.documentElement.setAttribute('data-theme', appliedTheme);

                                    // Prevent flash of default language
                                    const lang = localStorage.getItem('language') || 'de';
                                    document.documentElement.setAttribute('lang', lang);
                                    document.documentElement.setAttribute('data-language', lang);
                                } catch (e) {}
                            })();
                        `,
                    }}
                />
            </head>
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
