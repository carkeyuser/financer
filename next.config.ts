import type { NextConfig } from "next"
import pkg from "./package.json"

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["./src/generated/prisma/**/*"],
  },
  // LAN-IP here, e.g. "192.168.x.x" (your dev machine)
  allowedDevOrigins: [],
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
}

export default nextConfig
