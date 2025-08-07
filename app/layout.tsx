import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "3D Model Generator",
  description: "Convert your photos into 3D models",
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
        <script 
          type="module" 
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
