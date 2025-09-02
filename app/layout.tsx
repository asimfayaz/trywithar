import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { JobPollingProvider } from "@/components/job-polling-provider"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/contexts/AuthContext"

export const metadata: Metadata = {
  title: "Try with AR",
  description: "Convert any product photo to 3D and visualize it with AR before you buy/move it",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script 
          type="module" 
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"
        />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
          <JobPollingProvider />
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  )
}
