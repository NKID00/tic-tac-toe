import "./globals.scss";
import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tic Tac Toe",
  description: "Part of Practices",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white select-none overflow-hidden">{children}</body>
    </html>
  );
}
