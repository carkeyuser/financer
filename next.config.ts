import type { NextConfig } from "next"
import pkg from "./package.json"

const nextConfig: NextConfig = {
  output: "standalone",
  // LAN-IP hier eintragen, z. B. "192.168.x.x"
  allowedDevOrigins: [],
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
}

export default nextConfig
