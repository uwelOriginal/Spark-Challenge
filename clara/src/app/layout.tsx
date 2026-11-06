import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Fira_Sans, Lexend } from "next/font/google";
import "./globals.css";

// Atkinson is the default, Lexend is the alternative. Fira Sans for headings.
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap" });
const lexend = Lexend({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-lexend", display: "swap" });
const fira = Fira_Sans({ subsets: ["latin"], weight: ["600"], variable: "--font-fira", display: "swap" });

export const metadata: Metadata = {
  title: "Clara",
  description: "Instrucciones claras. Sin adivinar. Clara te ayuda a entender tus tareas, preguntar lo que no está claro y terminar.",
  applicationName: "Clara",
  appleWebApp: { capable: true, title: "Clara", statusBarStyle: "black" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#12151c", colorScheme: "dark light" };

// Apply saved settings before first paint to avoid a flash. Keep in sync with applyDisplay().
const prepaint = `try{var s=(JSON.parse(localStorage.getItem("clara.v3")||"{}").settings)||{},d=document.documentElement;
if(s.theme)d.dataset.theme=s.theme;if(s.accent)d.dataset.accent=s.accent;if(s.font)d.dataset.font=s.font;
if(s.textSize)d.dataset.text=s.textSize;if(s.controlSize)d.dataset.control=s.controlSize;if(s.spacing)d.dataset.spacing=s.spacing;if(s.motion)d.dataset.motion=s.motion;
if(s.dialect)d.lang=s.dialect}catch(e){}`;

// Chrome may fire this before React loads, InstallButton reads it later.
const installCapture = `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__claraInstall=e;dispatchEvent(new Event("clara-install-ready"))})`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es-MX"
      className={`${atkinson.variable} ${lexend.variable} ${fira.variable}`}
      data-theme="dark"
      data-accent="blue"
      data-font="atkinson"
      data-text="m"
      data-control="m"
      data-spacing="normal"
      data-motion="calm"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: prepaint }} />
        <script dangerouslySetInnerHTML={{ __html: installCapture }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
