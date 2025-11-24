import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";

// Structured Data for SEO
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Stagefy",
  "url": "https://www.stagefy.co.za",
  "logo": "https://www.stagefy.co.za/logo.png",
  "description": "AI-powered real estate marketing platform for South African property professionals",
  "foundingDate": "2024",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+27-11-864-1730",
    "contactType": "customer service",
    "availableLanguage": "English"
  },
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "ZA",
    "addressRegion": "Gauteng"
  },
  "sameAs": [
    "https://www.linkedin.com/company/stagefy",
    "https://twitter.com/stagefy_sa"
  ]
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Stagefy",
  "url": "https://www.stagefy.co.za",
  "description": "AI-powered real estate marketing platform",
  "publisher": {
    "@type": "Organization",
    "name": "Stagefy"
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://www.stagefy.co.za/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Stagefy - AI-Powered Real Estate Marketing Platform",
    template: "%s | Stagefy"
  },
  description: "Transform your real estate marketing with Stagefy's AI-powered tools. Generate compelling property descriptions, edit photos professionally, create stunning videos, and manage your CRM - all in one platform. Perfect for real estate agents and professionals.",
  keywords: [
    "Stagefy",
    "real estate AI",
    "property descriptions",
    "AI photo editor",
    "real estate CRM",
    "property marketing",
    "AI tools for agents",
    "real estate marketing",
    "property listings",
    "real estate automation",
    "South African real estate"
  ],
  authors: [{ name: "Stagefy" }],
  creator: "Stagefy",
  publisher: "Stagefy",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://www.stagefy.co.za'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Stagefy - AI-Powered Real Estate Marketing Platform",
    description: "Transform your real estate marketing with Stagefy's AI-powered tools. Generate compelling property descriptions, edit photos professionally, create stunning videos, and manage your CRM - all in one platform.",
    url: "https://www.stagefy.co.za",
    siteName: "Stagefy",
    locale: "en_ZA",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Stagefy - AI-Powered Real Estate Marketing Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stagefy - AI-Powered Real Estate Marketing Platform",
    description: "Transform your real estate marketing with Stagefy's AI-powered tools. Generate compelling property descriptions, edit photos professionally, create stunning videos, and manage your CRM.",
    creator: "@stagefy_sa",
    images: ["/twitter-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "google-site-verification=your-verification-code-here",
  },
  category: "Real Estate Technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-ZA">
      <head>
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'GA_MEASUREMENT_ID');
            `,
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
      </head>
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
