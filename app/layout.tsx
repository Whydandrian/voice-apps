import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Voice Call AI - ITK',
  description: 'Voice call application with AI customer service',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}