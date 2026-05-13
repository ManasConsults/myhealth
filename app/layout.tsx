import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ColorThemeProvider } from "@/components/ColorThemeProvider";
import { COLOR_THEME_STORAGE_KEY, DEFAULT_COLOR_THEME } from "@/lib/color-themes";

// Inter matches the clean, geometric feel of Apple's SF Pro on non-Apple devices.
// variable: "--font-sans" wires directly into the @theme inline block in globals.css.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MyHealth",
  description: "Your AI-powered health & fitness platform",
};

// Runs before React hydrates — prevents flash of wrong theme colour.
const initColorScript = `(function(){try{var c=localStorage.getItem('${COLOR_THEME_STORAGE_KEY}')||'${DEFAULT_COLOR_THEME}';document.documentElement.setAttribute('data-color',c);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initColorScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <ColorThemeProvider>
            <SessionProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </SessionProvider>
          </ColorThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
