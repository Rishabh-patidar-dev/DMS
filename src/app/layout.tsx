import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter, Geist_Mono } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-display',
  subsets: ['latin'],
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Luxus Green DMS — Dealer Portal',
  description: 'Order vehicles and spare parts, track allocated stock, and raise warranty claims — the operational home for a live Luxus Green Mobility dealership.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* webp isn't a Next.js file-convention favicon extension (icon.ico/png/jpg/svg only) — linked manually instead */}
        <link rel="icon" type="image/webp" href="/luxus-green-logo.webp" />
      </head>
      <body className="min-h-full flex flex-col bg-brand-white text-ink">{children}</body>
    </html>
  )
}
