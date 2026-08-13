import type { NextConfig } from 'next';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = SUPABASE_URL ? new URL(SUPABASE_URL).hostname : undefined;

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  experimental: {
    optimizePackageImports: ['@anthropic-ai/sdk', '@supabase/ssr', '@supabase/supabase-js'],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    // O Storage do Supabase devolve `cache-control: no-cache`, o que faria o
    // otimizador revalidar toda hora. Como as thumbs têm URL única por upload,
    // dá para segurar o resultado otimizado por bastante tempo.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    remotePatterns: [
      ...(supabaseHost
        ? [
            {
              protocol: 'https' as const,
              hostname: supabaseHost,
              pathname: '/storage/v1/object/public/**',
            },
          ]
        : []),
      {
        protocol: 'https' as const,
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },

  async redirects() {
    return [
      { source: '/pre-venda', destination: '/', permanent: true },
      { source: '/pre-venda/obrigado', destination: '/', permanent: true },
      // Reviews virou sub-aba de Campanhas (migration 0035). Aqui e nao numa
      // page com redirect(): o layout do dashboard e client component, entao o
      // redirect renderizado vira navegacao no cliente (com flash) em vez de
      // 307 no documento. permanent: false de proposito — 308 e cacheado pelo
      // browser e travaria a URL; nada externo aponta para ca.
      {
        source: '/dashboard/reviews',
        destination: '/dashboard/campanhas/reviews',
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
