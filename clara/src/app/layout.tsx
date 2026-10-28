import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Fira_Sans } from "next/font/google";
import "./globals.css";

// Atkinson Hyperlegible (Braille Institute) for reading; Fira Sans for titles and the wordmark,
// close to the bold rounded sans of the partner's own slides. Self-hosted at build time.
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap" });
const fira = Fira_Sans({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-fira", display: "swap" });

export const metadata: Metadata = {
  title: "Clara",
  description: "Instrucciones claras. Sin adivinar. Clara te ayuda a entender tus tareas, preguntar lo que no está claro y empezar.",
  applicationName: "Clara",
  appleWebApp: { capable: true, title: "Clara", statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${atkinson.variable} ${fira.variable}`}>
      <body>{children}</body>
    </html>
  );
}
