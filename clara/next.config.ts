import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // no linter set up yet, build still type-checks
  eslint: { ignoreDuringBuilds: true },
  devIndicators: false,
  // bundling breaks the ffmpeg binary path
  serverExternalPackages: ["ffmpeg-static"],
};

export default nextConfig;
