import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Linting is not part of the POC toolchain yet; type-checking still runs on build.
  eslint: { ignoreDuringBuilds: true },
  devIndicators: false,
  // Keep the ffmpeg binary's real path (bundling would break it).
  serverExternalPackages: ["ffmpeg-static"],
};

export default nextConfig;
