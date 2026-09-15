import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera .next/standalone con server.js y solo las deps necesarias,
  // requerido por infra/docker/Dockerfile
  output: "standalone",

  // El traceo del standalone con pnpm copia el symlink de @swc/helpers dentro
  // del directorio de Next pero no todos los archivos del paquete (faltan los
  // de esm/), y server.js muere con "Cannot find module @swc/helpers/esm/...".
  // Forzamos la inclusión del paquete completo para todas las rutas.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/.pnpm/@swc+helpers*/node_modules/@swc/helpers/**/*"],
  },
};

export default nextConfig;
