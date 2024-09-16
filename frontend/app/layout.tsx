import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProvider } from "@/components/layout/themeProvider"
import { ClerkProvider } from "@clerk/nextjs"
import { Toaster } from "@/components/ui/sonner"
import { Analytics } from "@vercel/analytics/react"
import { PreviewProvider } from "@/context/PreviewContext";
import { SocketProvider } from '@/context/SocketContext'

export const metadata: Metadata = {
  title: "Sandbox",
  description: "A collaborative, AI-powered cloud code editing environment",
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            forcedTheme="dark"
            disableTransitionOnChange
          >
            <SocketProvider>
            <PreviewProvider>
            {children}
            </PreviewProvider>
            </SocketProvider>
            <Analytics />
            <Toaster position="bottom-left" richColors />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}