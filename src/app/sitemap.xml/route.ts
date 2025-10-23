import { NextRequest } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://propertybuddy.ai';

const staticPages = [
  '',
  '/login',
  '/register',
  '/forgot-password',
  '/dashboard',
  '/photo-editor',
  '/property-descriptions',
  '/ai-chat',
  '/video-generator',
  '/marketing-materials',
  '/templates',
  '/template-editor',
  '/crm',
  '/canva-upload',
  '/payment',
  '/account',
  '/credits',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/support'
];

function generateSitemap() {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(page => `  <url>
    <loc>${BASE_URL}${page}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page === '' ? 'daily' : 'weekly'}</changefreq>
    <priority>${page === '' ? '1.0' : page.startsWith('/dashboard') ? '0.8' : '0.6'}</priority>
  </url>`).join('\n')}
</urlset>`;

  return sitemap;
}

export async function GET(request: NextRequest) {
  const sitemap = generateSitemap();

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
}