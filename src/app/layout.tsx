import { GeoJsonLd } from '@/components/native/GeoJsonLd'
import { ModalProvider } from '@/providers/modal-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { Inter } from 'next/font/google'
import { config } from '@/lib/config'
import { getHtmlLang } from '@/lib/locale'

import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
   title: config.store.name,
   description: config.store.description,
   keywords: config.store.keywords,
   authors: [{ name: config.store.creator }],
   creator: config.store.creator,
   publisher: config.store.creator,
}

export default async function RootLayout({
   children,
}: {
   children: React.ReactNode
}) {
   return (
      <html lang={getHtmlLang()}>
         <body className={inter.className}>
            <GeoJsonLd />
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
               <ToastProvider />
               <ModalProvider />
               {children}
            </ThemeProvider>
         </body>
      </html>
   )
}
