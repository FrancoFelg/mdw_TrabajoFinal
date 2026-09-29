// Contrato de GET /api/health (src/app/api/health/route.ts)
export type EstadoSalud = {
  status: "ok" | "degraded";
  db: "ok" | "unreachable";
  dbLatencyMs?: number;
  uptimeSeconds: number;
  timestamp: string;
};
