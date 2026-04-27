import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Gamifier",
  description: "Turn any learning resource into a streak.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-body antialiased">
        <div className="mx-auto max-w-3xl px-6 py-10">{children}</div>
      </body>
    </html>
  );
}
