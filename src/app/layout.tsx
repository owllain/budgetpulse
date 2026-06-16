import type { Metadata } from "next";
import { Inter, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/budgetpulse/providers";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const ibmPlex = IBM_Plex_Sans({ variable: "--font-ibm-plex", weight: ["400", "500", "600", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BudgetPulse — Gestión Financiera Inteligente",
  description: "Aplicación moderna de gestión presupuestaria con calculadoras financieras para Costa Rica.",
  icons: { icon: "/icon.png", apple: "/icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} ${ibmPlex.variable} antialiased bg-[#060609] text-foreground font-sans`}>
        <Providers>
          {children}
        </Providers>
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  );
}
