import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import NextTopLoader from "nextjs-toploader";
import QueryProvider from "@/components/providers/query-provider";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { PWAInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://hjrbda.com",
  ),
  title: "HJRBDA Project Management System",
  description: "HJRBDA Project Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HJRBDA",
  },
  icons: {
    icon: [
      {
        url: "/icon.png",
        media: "(prefers-color-scheme: light)",
      },
    ],
    apple: [
      {
        url: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "/",
    siteName: "HJRBDA",
    title: "HJRBDA - A Project Management Software",
    description: "Manage multiple projects in realtime with collaborations.",
    images: [
      {
        url: "/icon.png",
        width: 2048,
        height: 2048,
        alt: "HJRBDA Logo",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className={` antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <NextTopLoader showSpinner={false} />
          <QueryProvider>
            <ServiceWorkerRegister />
            <PWAInstallPrompt />
            <div>{children}</div>
          </QueryProvider>
          <SonnerToaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
