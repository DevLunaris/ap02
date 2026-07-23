import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Erzeugt .next/standalone - Grundlage für das schlanke Docker-Image.
  output: 'standalone',
  // mermaid ist ein reines Client-Paket; ohne dieses Transpile-Hint stolpert
  // der Server-Build über die ESM-Only-Subdependencies.
  transpilePackages: ['mermaid'],
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

export default nextConfig
