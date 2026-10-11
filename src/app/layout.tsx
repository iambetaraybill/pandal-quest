import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono, Noto_Serif_Bengali } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SwRegister } from "@/components/sw-register";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], style: ["normal", "italic"] });
const bengali = Noto_Serif_Bengali({ variable: "--font-bengali", subsets: ["bengali"] });

export const metadata: Metadata = {
  title: {
    default: "Pandal Quest: plan in thirty seconds, walk all night",
    template: "%s · Pandal Quest",
  },
  description:
    "A Durga Puja pandal-hopping companion for Kolkata. A local open model (Gemma 4 via Ollama) plans a crowd-aware walking route, then the app gets out of your way: pocket mode, dhak drum arrival cues and story cards you unlock by showing up.",
  applicationName: "Pandal Quest",
  appleWebApp: { capable: true, title: "Pandal Quest", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#be241f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${bengali.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <TooltipProvider>
            <SiteHeader />
            <main className="flex flex-1 flex-col">{children}</main>
            <Toaster position="top-center" />
          </TooltipProvider>
          <SwRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
