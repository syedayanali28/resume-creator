import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
