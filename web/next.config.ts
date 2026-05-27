import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/cursor-tailor", destination: "/add", permanent: false },
      { source: "/cursor-tailor/:path*", destination: "/add", permanent: false },
      { source: "/zap", destination: "/add", permanent: false },
      { source: "/runs", destination: "/history", permanent: false },
      { source: "/login", destination: "/", permanent: false },
    ];
  },
  // @cursor/sdk ships a .LICENSE.txt sidecar that Turbopack cannot bundle; keep the SDK external.
  serverExternalPackages: ["@cursor/sdk"],
  // @cursor/sdk statically imports sqlite3; native builds break on Vercel/Node 24. pnpm overrides swap in a stub;
  // this alias covers Turbopack resolution during the server bundle.
  turbopack: {
    resolveAlias: {
      sqlite3: "./vendor/sqlite3-stub/index.js",
    },
  },
};

export default nextConfig;
