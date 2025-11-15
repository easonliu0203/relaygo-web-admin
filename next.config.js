/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // 圖片優化
  images: {
    domains: [
      'localhost',
      'firebasestorage.googleapis.com',
      'supabase.co',
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // 重寫規則：將特定 API 路由代理到外部 Backend
  // ⚠️ 重要：保留 /api/admin/*, /api/auth/*, /api/chat/*, /api/profile/* 給 Next.js 內部 API
  async rewrites() {
    // 不使用 NEXT_PUBLIC_API_URL，因為這會導致所有 API 路由被重寫
    // 公司端網頁應該使用 Next.js 內部 API 路由
    return [];
  },
  
  // 標頭設定
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Webpack 配置
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 自定義 webpack 配置
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    return config;
  },
  
  // 實驗性功能
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  
  // 壓縮
  compress: true,
  
  // 電源效率
  poweredByHeader: false,
  
  // 嚴格模式
  typescript: {
    ignoreBuildErrors: false,
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
