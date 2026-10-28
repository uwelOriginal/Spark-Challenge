import type { MetadataRoute } from "next";

// Installable on phones (PWA): opens full screen from the home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clara",
    short_name: "Clara",
    description: "Instrucciones claras. Sin adivinar.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
