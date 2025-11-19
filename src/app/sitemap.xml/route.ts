import { NextRequest } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stagefy.co.za';

const staticPages = [
  '',
  '/about',
  '/privacy',
  '/terms',
  '/support',
  '/login',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/dashboard',
  '/photo-editor',
  '/property-descriptions',
  '/ai-chat',
  '/ai-video',
  '/ai-video-editor',
  '/video-ai-maker',
  '/marketing-materials',
  '/marketing-materials/checkout',
  '/marketing-materials/payment-success',
  '/templates',
  '/template-editor',
  '/crm',
  '/canva-upload',
  '/payment',
  '/account',
  '/contact',
  '/admin',
  '/admin/dashboard',
  '/admin/properties',
  '/admin/bookings',
  '/admin/maintenance',
  '/admin/messages',
  '/admin/reports',
  '/admin/owners',
  '/admin/marketing-materials',
  '/client/dashboard',
  '/client/properties',
  '/client/bookings',
  '/client/maintenance',
  '/client/gallery',
  '/client/messages',
  '/agent/dashboard',
  '/agent/listings/new'
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