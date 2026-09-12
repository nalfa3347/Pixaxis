/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  compress: true,
  poweredByHeader: false,
  allowedDevOrigins: ['192.168.1.87', 'localhost', '127.0.0.1'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;

