
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { SoundProvider } from "@/providers/SoundProvider";
import Script from "next/script";
import { PrivacyProvider } from "@/providers/PrivacyProvider";
import { UIProvider } from "@/components/ThemeProvider";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { OperationProvider } from "@/contexts/OperationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const inter = Inter({ subsets: ["latin"] });

const APP_NAME = "Painel Financeiro";
const APP_DEFAULT_TITLE = "Painel Financeiro";
const APP_TITLE_TEMPLATE = "%s - Painel";
const APP_DESCRIPTION =
  "Divisão automática de lucro entre Cabral, Biel e Soares";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#26224A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png"></link>
        <meta name="theme-color" content="#26224A" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <FirebaseClientProvider>
          <UIProvider>
            <SoundProvider>
              <PrivacyProvider>
                <AuthProvider>
                  <OrganizationProvider>
                    <OperationProvider>
                      <ProtectedRoute>
                        {children}
                      </ProtectedRoute>
                    </OperationProvider>
                  </OrganizationProvider>
                </AuthProvider>
              </PrivacyProvider>
            </SoundProvider>
          </UIProvider>
        </FirebaseClientProvider>
        <Toaster />
        <Script id="service-worker-registration">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker
                  .register('/sw.js')
                  .then((registration) => console.log('PWA Service Worker registered with scope:', registration.scope))
                  .catch((error) => console.error('PWA Service Worker registration failed:', error));
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
