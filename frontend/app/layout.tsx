import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'VerifAI - Stock Verification',
  description: 'Bank-grade stock verification system with GPS validation and AI-powered analysis',
  keywords: ['stock verification', 'warehouse audit', 'GPS verification', 'AI analysis'],
  authors: [{ name: 'VerifAI' }],
  robots: 'noindex, nofollow',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-gray-50 min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
