import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  // LAN-IP hier eintragen, z. B. "192.168.1.50"
  allowedDevOrigins: [],
}

export default nextConfig
