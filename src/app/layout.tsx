import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pistas Padel San Cristobal de Segovia | Gestión de pistas",
  description: "Agenda y gestión de iluminación de pistas de pádel.",
};

/** Proporciona el documento HTML raíz en español para todas las páginas de la aplicación. */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
