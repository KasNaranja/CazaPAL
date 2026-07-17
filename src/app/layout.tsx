import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CazaPAL — copias en español en Vinted y Wallapop",
  description:
    "Busca un videojuego en Vinted y Wallapop; CazaPAL analiza las fotos con IA para mostrarte solo las copias en español, de más barata a más cara.",
};

export const viewport: Viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
