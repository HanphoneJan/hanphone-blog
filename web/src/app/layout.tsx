import type { Metadata, Viewport } from 'next'
import { Noto_Serif_SC } from 'next/font/google'
import { UserProvider } from '@/contexts/UserContext'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import './globals.css'
import { headers } from 'next/headers'
import { SITE_CONFIG, SITE_URL } from '@/lib/seo-config'

const notoSerifSc = Noto_Serif_SC({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_CONFIG.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SITE_CONFIG.name
  },
  title: {
    default: `${SITE_CONFIG.name} - Hanphone's Blog`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  keywords: [...SITE_CONFIG.keywords],
  authors: [{ name: SITE_CONFIG.author.name, url: SITE_URL }],
  creator: SITE_CONFIG.author.name,
  publisher: SITE_CONFIG.author.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: SITE_CONFIG.locale,
    url: SITE_URL,
    siteName: SITE_CONFIG.name,
    title: `${SITE_CONFIG.name} - Hanphone's Blog`,
    description: SITE_CONFIG.description,
    images: [
      {
        url: `${SITE_URL}${SITE_CONFIG.images.ogImage}`,
        width: 1200,
        height: 630,
        alt: SITE_CONFIG.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_CONFIG.name} - Hanphone's Blog`,
    description: SITE_CONFIG.description,
    images: [`${SITE_URL}${SITE_CONFIG.images.ogImage}`],
    creator: SITE_CONFIG.social.twitter,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  bookmarks: [SITE_URL],
  category: SITE_CONFIG.category,
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  themeColor: '#f8fafc'
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const headerList = await headers()
  const theme = headerList.get('x-theme') || 'light'
  const isDark = theme === 'dark'
  const backgroundImageUrl = '/background.webp'
  
  return (
    <html lang={SITE_CONFIG.language} className={isDark ? 'dark' : ''}>
      <head>
        <link 
          rel="preload" 
          href={backgroundImageUrl} 
          as="image" 
        />
      </head>
      <body className={`min-h-screen ${notoSerifSc.className}`}>
        <ThemeProvider>
          <UserProvider>
            <main>{children}</main>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
