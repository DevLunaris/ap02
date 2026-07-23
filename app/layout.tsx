import type { Metadata, Viewport } from 'next'

import { SiteHeader } from '@/components/site-header'
import { ThemeProvider } from '@/components/theme-provider'
import { EXAM_LABEL } from '@/config/exam'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'AP2 Lernhub',
    template: '%s · AP2 Lernhub',
  },
  description: `Persönliche Lernplattform für die IHK-Abschlussprüfung Teil 2 (${EXAM_LABEL}), Fachinformatiker Anwendungsentwicklung.`,
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbfd' },
    { media: '(prefers-color-scheme: dark)', color: '#15171f' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-dvh">
        <ThemeProvider>
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
          <footer className="mt-16 border-t border-line py-6 text-center text-xs text-ink-muted">
            AP2 Lernhub · privat &amp; selbst gehostet · {EXAM_LABEL}
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}
