import './globals.scss'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tic Tac Toe',
  description: 'Part of Practices',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white select-none">{children}</body>
    </html>
  )
}
