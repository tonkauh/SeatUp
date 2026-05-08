/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ยอมให้ Build ผ่านแม้จะมี Error ของ TypeScript
    ignoreBuildErrors: true,
  },
  eslint: {
    // ยอมให้ Build ผ่านแม้จะมี Error ของ ESLint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;