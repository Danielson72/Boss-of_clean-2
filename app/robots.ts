import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/admin/',
          '/settings/',
          '/logout/',
          '/auth/',
          '/login/',
          '/signup/',
          '/forgot-password/',
          '/_next/',
          '/static/',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
