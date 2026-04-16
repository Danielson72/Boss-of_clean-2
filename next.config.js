/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Prevents clickjacking — nobody can embed BOC in an iframe
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stops browsers from guessing file types (prevents MIME sniffing attacks)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Controls how much referrer info is sent when clicking links
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Forces HTTPS for 1 year — no downgrade to HTTP
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Disables browser features BOC doesn't need
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Prevents XSS attacks by controlling what scripts can run
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
