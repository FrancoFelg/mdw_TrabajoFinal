// GET /api/health — usado por monitoreo y por el healthcheck del contenedor
export async function GET() {
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}
