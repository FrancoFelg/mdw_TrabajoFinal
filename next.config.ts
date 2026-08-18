import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera .next/standalone con server.js y solo las deps necesarias,
  // requerido por infra/docker/Dockerfile
  output: "standalone",
};

export default nextConfig;
