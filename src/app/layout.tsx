import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Property Buddy AI - AI-Powered Real Estate Tools",
  description: "Transform your real estate workflow with AI-powered property descriptions, photo editing, video generation, and CRM tools. Perfect for real estate agents and professionals.",
  keywords: "real estate AI, property descriptions, AI photo editor, real estate CRM, property marketing, AI tools for agents",
  authors: [{ name: "Property Buddy AI" }],
  creator: "Property Buddy AI",
  publisher: "Property Buddy AI",
  openGraph: {
    title: "Property Buddy AI - AI-Powered Real Estate Tools",
    description: "Transform your real estate workflow with AI-powered property descriptions, photo editing, video generation, and CRM tools.",
    url: "https://propertybuddy.ai",
    siteName: "Property Buddy AI",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Property Buddy AI - AI-Powered Real Estate Tools",
    description: "Transform your real estate workflow with AI-powered property descriptions, photo editing, video generation, and CRM tools.",
    creator: "@propertybuddyai",
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
  verification: {
    google: "your-google-site-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
