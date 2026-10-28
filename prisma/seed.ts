// Datos de demostración para desarrollo: personas, cursos, certificados, pedidos de
// ascenso y emergencias en CABA y el GBA. Todo es ficticio (nombres y casos inventados,
// sin fotos de personas) y se puede correr varias veces: usuarios y certificados se
// actualizan y las emergencias de demo se reemplazan.
//
//   pnpm seed
//
// No corre contra una base que no sea local salvo con SEED_FORZAR=1.
import bcrypt from 'bcrypt';
import { PrismaClient, type CertificadoEstado, type EmergenciaEstado, type Prioridad, type Provincia, type Rol } from '@prisma/client';

const db = new PrismaClient();
const PASSWORD = 'demo12345';
// Ids de emergencias de demo: prefijo fijo + 4 caracteres que son el código visible (#A3F1).
const ID_EMERGENCIA = (codigo: string) => `cmdemo000000000000000${codigo.toLowerCase()}`;

function verificarDestino() {
  const url = process.env.DATABASE_URL ?? '';
  const local = /@(localhost|127\.0\.0\.1|db)(:\d+)?\//.test(url);
  if ((process.env.NODE_ENV === 'production' || !local) && process.env.SEED_FORZAR !== '1') {
    console.error('Seed cancelado: DATABASE_URL no apunta a una base local. Usá SEED_FORZAR=1 si de verdad querés cargar datos de demo ahí.');
    process.exit(1);
  }
}

const PERSONAS: { usuario: string; nombre: string; apellido: string; nacimiento: string; rol: Rol }[] = [
  { usuario: 'demo.admin', nombre: 'Carla', apellido: 'Benítez', nacimiento: '1986-03-12', rol: 'ADMIN' },
  { usuario: 'demo.coordinador', nombre: 'Martín', apellido: 'Sosa', nacimiento: '1990-07-21', rol: 'COORDINADOR' },
  { usuario: 'demo.coordinadora', nombre: 'Paula', apellido: 'Giménez', nacimiento: '1988-11-02', rol: 'COORDINADOR' },
  { usuario: 'demo.voluntaria', nombre: 'Lucía', apellido: 'Ferreyra', nacimiento: '1995-04-10', rol: 'VOLUNTARIO' },
  { usuario: 'demo.voluntario2', nombre: 'Tomás', apellido: 'Ibarra', nacimiento: '1998-09-30', rol: 'VOLUNTARIO' },
  { usuario: 'demo.sofia', nombre: 'Sofía', apellido: 'Quiroga', nacimiento: '1993-01-18', rol: 'VOLUNTARIO' },
  { usuario: 'demo.nicolas', nombre: 'Nicolás', apellido: 'Paz', nacimiento: '1991-06-05', rol: 'VOLUNTARIO' },
  { usuario: 'demo.valentina', nombre: 'Valentina', apellido: 'Ruiz', nacimiento: '2000-02-14', rol: 'VOLUNTARIO' },
  { usuario: 'demo.joaquin', nombre: 'Joaquín', apellido: 'Medina', nacimiento: '1997-12-08', rol: 'VOLUNTARIO' },
];

const CURSOS = [
  { titulo: 'Primeros auxilios básicos', descripcion: 'RCP, control de hemorragias y posición de seguridad.', desde: '2026-11-03', hasta: '2026-11-24' },
  { titulo: 'RCP y uso de DEA', descripcion: 'Reanimación cardiopulmonar en adultos y uso del desfibrilador externo automático.', desde: '2026-11-10', hasta: '2026-11-12' },
  { titulo: 'Abordaje de personas en situación de calle', descripcion: 'Primer contacto, escucha y derivación a la red de servicios sociales.', desde: '2026-12-01', hasta: '2026-12-15' },
  { titulo: 'Salud mental: primera escucha', descripcion: 'Cómo acompañar una crisis y cuándo pedir ayuda profesional.', desde: '2027-02-02', hasta: '2027-02-23' },
];

// [usuario, código de verificación, curso (título o null), estado, motivo de rechazo]
const CERTIFICADOS: [string, string, string | null, CertificadoEstado, string?][] = [
  ['demo.sofia', 'PA-2026-0112', 'Primeros auxilios básicos', 'APROBADO'],
  ['demo.nicolas', 'RCP-2026-0078', 'RCP y uso de DEA', 'APROBADO'],
  ['demo.coordinadora', 'CRUZ-2025-3391', null, 'APROBADO'],
  ['demo.voluntaria', 'PA-2026-0193', 'Primeros auxilios básicos', 'PENDIENTE'],
  ['demo.joaquin', 'CALLE-2026-0021', 'Abordaje de personas en situación de calle', 'PENDIENTE'],
  ['demo.valentina', 'EXT-2026-5512', null, 'RECHAZADO', 'El código no coincide con el que figura en la imagen. Subí una foto donde se lea completo.'],
];

const PEDIDOS_ASCENSO = ['demo.voluntaria', 'demo.sofia'];

type Caso = { codigo: string; descripcion: string; prioridad: Prioridad; estado: EmergenciaEstado; lat: number; lng: number; provincia: Provincia; haceMin: number; asignado?: string };

const EMERGENCIAS: Caso[] = [
  { codigo: 'K7Q2', descripcion: 'Hombre de unos 60 años tirado en la vereda frente a la estación. No responde cuando le hablo y respira con dificultad.', prioridad: 'ROJO', estado: 'SIN_GESTIONAR', lat: -34.6092, lng: -58.4071, provincia: 'CABA', haceMin: 6 },
  { codigo: 'B3X9', descripcion: 'Mujer con una herida en la pierna, sangra un poco. Está consciente y pide agua. Esquina de la farmacia.', prioridad: 'AMARILLO', estado: 'SIN_GESTIONAR', lat: -34.6037, lng: -58.3816, provincia: 'CABA', haceMin: 14 },
  { codigo: 'T5M1', descripcion: 'Pareja joven con un bebé durmiendo en la puerta de un banco. Mucho frío, el bebé está con poca ropa.', prioridad: 'AMARILLO', estado: 'SIN_GESTIONAR', lat: -34.5952, lng: -58.3976, provincia: 'CABA', haceMin: 22 },
  { codigo: 'H2R8', descripcion: 'Señor mayor sentado en la plaza desde la mañana, dice que no comió. Está tranquilo y conversa.', prioridad: 'VERDE', estado: 'SIN_GESTIONAR', lat: -34.5875, lng: -58.4335, provincia: 'CABA', haceMin: 35 },
  { codigo: 'W9D4', descripcion: 'Persona durmiendo bajo la autopista, sin frazadas. No pude acercarme a preguntar.', prioridad: 'VERDE', estado: 'SIN_GESTIONAR', lat: -34.6218, lng: -58.3958, provincia: 'CABA', haceMin: 48 },
  { codigo: 'P6L3', descripcion: 'Hombre que se cayó en el andén, golpe en la cabeza. Está confundido y no sabe dónde está.', prioridad: 'ROJO', estado: 'SIN_GESTIONAR', lat: -34.6627, lng: -58.3653, provincia: 'BUENOS_AIRES', haceMin: 9 },
  { codigo: 'C4N7', descripcion: 'Adolescente solo en la terminal, dice que se fue de su casa. Está asustado pero bien.', prioridad: 'AMARILLO', estado: 'SIN_GESTIONAR', lat: -34.5266, lng: -58.4794, provincia: 'BUENOS_AIRES', haceMin: 55 },
  { codigo: 'R1F5', descripcion: 'Mujer con convulsiones en la parada del colectivo. Ya pasaron, ahora está muy somnolienta.', prioridad: 'ROJO', estado: 'EN_CAMINO', lat: -34.6158, lng: -58.4333, provincia: 'CABA', haceMin: 18, asignado: 'demo.nicolas' },
  { codigo: 'G8V2', descripcion: 'Señor en silla de ruedas varado en la vereda, se le pinchó una rueda y no puede moverse.', prioridad: 'VERDE', estado: 'EN_CAMINO', lat: -34.6045, lng: -58.4113, provincia: 'CABA', haceMin: 26, asignado: 'demo.joaquin' },
  { codigo: 'M3J6', descripcion: 'Persona con mucho frío en la plaza, pedía abrigo.', prioridad: 'VERDE', estado: 'GESTIONADA', lat: -34.5995, lng: -58.3700, provincia: 'CABA', haceMin: 190, asignado: 'demo.sofia' },
  { codigo: 'Z2Q8', descripcion: 'Hombre con dolor de pecho sentado en la escalera del subte.', prioridad: 'ROJO', estado: 'GESTIONADA', lat: -34.6083, lng: -58.3712, provincia: 'CABA', haceMin: 320, asignado: 'demo.nicolas' },
];

async function main() {
  verificarDestino();
  const hash = await bcrypt.hash(PASSWORD, 10);
  const ids = new Map<string, string>();

  for (const p of PERSONAS) {
    const existente = await db.usuario.findUnique({ where: { nombreUsuario: p.usuario } });
    if (existente) {
      await db.usuario.update({ where: { id: existente.id }, data: { rol: p.rol, password: hash, persona: { update: { nombre: p.nombre, apellido: p.apellido } } } });
      ids.set(p.usuario, existente.id);
    } else {
      const u = await db.usuario.create({ data: { nombreUsuario: p.usuario, password: hash, rol: p.rol, persona: { create: { nombre: p.nombre, apellido: p.apellido, fechaNac: new Date(`${p.nacimiento}T00:00:00Z`) } } } });
      ids.set(p.usuario, u.id);
    }
  }
  const id = (usuario: string) => ids.get(usuario)!;
  const coordinador = id('demo.coordinador');

  const cursos = new Map<string, string>();
  for (const c of CURSOS) {
    const existente = await db.cursos.findFirst({ where: { titulo: c.titulo, fechaEliminacion: null } });
    const curso = existente ?? await db.cursos.create({ data: { titulo: c.titulo, descripcion: c.descripcion, fechaDesde: new Date(`${c.desde}T00:00:00Z`), fechaHasta: new Date(`${c.hasta}T00:00:00Z`), usuarioCreacionId: coordinador } });
    cursos.set(c.titulo, curso.id);
  }

  for (const [usuario, codigo, curso, estado, motivo] of CERTIFICADOS) {
    const datos = { usuarioId: id(usuario), cursoId: curso ? cursos.get(curso) ?? null : null, estado, motivoRechazo: motivo ?? null, fechaEliminacion: null };
    await db.certificado.upsert({ where: { codigoVerificacion: codigo }, update: datos, create: { ...datos, codigoVerificacion: codigo, usuarioCreacionId: id(usuario) } });
  }

  for (const usuario of PEDIDOS_ASCENSO) {
    const pendiente = await db.solicitudAscenso.findFirst({ where: { usuarioId: id(usuario), estado: 'PENDIENTE' } });
    if (!pendiente) await db.solicitudAscenso.create({ data: { usuarioId: id(usuario) } });
  }

  // Emergencias de demo: se borran las anteriores (con sus asignaciones y adjuntos) y se recrean.
  const anteriores = await db.emergencia.findMany({ where: { id: { startsWith: 'cmdemo' } }, select: { id: true, ubicacionId: true } });
  if (anteriores.length) {
    const idsEm = anteriores.map(e => e.id);
    await db.$transaction([
      db.notificacion.deleteMany({ where: { enlace: { in: idsEm.map(id => `/casos/${id}`) } } }),
      db.emergenciaAdjunto.deleteMany({ where: { emergenciaId: { in: idsEm } } }),
      db.usuarioEmergencia.deleteMany({ where: { emergenciaId: { in: idsEm } } }),
      db.emergencia.deleteMany({ where: { id: { in: idsEm } } }),
      db.ubicacion.deleteMany({ where: { id: { in: anteriores.map(e => e.ubicacionId) } } }),
    ]);
  }
  // Un voluntario tiene como máximo un caso en camino (regla 4): se liberan los de demo antes de asignar.
  const conCaso = EMERGENCIAS.filter(e => e.estado === 'EN_CAMINO' && e.asignado).map(e => id(e.asignado!));
  const enCurso = await db.emergencia.findMany({ where: { estado: 'EN_CAMINO', usuarios: { some: { usuarioId: { in: conCaso } } } }, select: { id: true } });
  if (enCurso.length) await db.emergencia.updateMany({ where: { id: { in: enCurso.map(e => e.id) } }, data: { estado: 'GESTIONADA' } });

  const ahora = Date.now();
  for (const e of EMERGENCIAS) {
    const fecha = new Date(ahora - e.haceMin * 60000);
    await db.emergencia.create({
      data: {
        id: ID_EMERGENCIA(e.codigo),
        descripcion: e.descripcion,
        fecha,
        creadoEn: fecha,
        prioridad: e.prioridad,
        estado: e.estado,
        ubicacion: { create: { coordenada_x: e.lng, coordenada_y: e.lat, provincia: e.provincia } },
        ...(e.asignado ? { usuarios: { create: { usuarioId: id(e.asignado) } } } : {}),
      },
    });
  }

  console.log(`Listo: ${PERSONAS.length} personas, ${CURSOS.length} cursos, ${CERTIFICADOS.length} certificados, ${PEDIDOS_ASCENSO.length} pedidos de ascenso y ${EMERGENCIAS.length} emergencias de demo.`);
  console.log(`Contraseña de todas las cuentas de demo: ${PASSWORD}`);
}

main()
  .catch(error => { console.error(error); process.exit(1); })
  .finally(() => db.$disconnect());
