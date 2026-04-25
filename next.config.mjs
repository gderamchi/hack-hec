import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  serverExternalPackages: ["pdf-parse"],
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
