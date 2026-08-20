import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera un build autocontenido para Docker/VPS (imagen liviana).
  output: "standalone",
};

export default nextConfig;
