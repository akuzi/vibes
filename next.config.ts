import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Lint all directories by default (Vercel recommendation)
    dirs: ['src', 'app', 'pages', 'components', 'lib'],
    // Report unused disable directives (Vercel recommendation)
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Type checking during build (Vercel recommendation)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
