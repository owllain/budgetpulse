import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BudgetFlow - Gestión Financiera Inteligente",
  description: "Aplicación moderna de gestión presupuestaria con calculadoras financieras para Costa Rica. Presupuestos, proyecciones, aguinaldo y más.",
  keywords: ["presupuesto", "finanzas", "Costa Rica", "calculadora", "aguinaldo", "tarjeta crédito"],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${poppins.variable} antialiased bg-background text-foreground font-sans`}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
