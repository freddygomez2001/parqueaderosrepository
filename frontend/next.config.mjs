/** @type {import('next').NextConfig} */
const nextConfig = {
  // ❌ NO USAR STANDALONE para Electron
  // output: 'standalone', 
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    unoptimized: true,
  },
}

export default nextConfig