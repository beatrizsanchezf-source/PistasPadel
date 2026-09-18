import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Punto de Oro | Gestión de pistas",
  description: "Agenda y gestión de iluminación de pistas de pádel.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
