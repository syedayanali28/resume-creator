import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @cursor/sdk ships a .LICENSE.txt sidecar that Turbopack cannot bundle; keep the SDK external.
  serverExternalPackages: ["@cursor/sdk"],
};

export default nextConfig;
