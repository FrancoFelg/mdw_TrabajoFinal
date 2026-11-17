import { NextResponse } from 'next/server';
import { responderErrorCurso } from './cursoErrores';

// Códigos de negocio de certificados → HTTP. `campo` le dice al formulario dónde mostrar el error.
const ERRORES: Record<string, { status: number; mensaje: string; campo?: string }> = {
  BODY_INVALIDO: { status: 400, mensaje: 'No pudimos leer el formulario. Revisalo y volvé a enviarlo.' },
  CERTIFICADO_NO_ENCONTRADO: { status: 404, mensaje: 'Certificado no encontrado.' },
  CAMPOS_OBLIGATORIOS_FALTANTES: { status: 400, mensaje: 'Completá el nombre, la entidad emisora y la fecha de emisión.' },
  FECHA_INVALIDA: { status: 400, mensaje: 'Elegí una fecha de emisión válida que no sea posterior a hoy.', campo: 'fechaEmision' },
  ARCHIVO_REQUERIDO: { status: 400, mensaje: 'Adjuntá el archivo del certificado.', campo: 'archivo' },
  ARCHIVO_INVALIDO: { status: 400, mensaje: 'Elegí un PDF o una imagen JPG, PNG o WebP de hasta 5 MB.', campo: 'archivo' },
  ARCHIVO_DEMASIADO_GRANDE: { status: 413, mensaje: 'El archivo debe pesar hasta 5 MB.', campo: 'archivo' },
  ATRIBUTO_NO_ENCONTRADO: { status: 404, mensaje: 'Alguno de los datos adicionales ya no existe. Quitalo y volvé a intentar.', campo: 'atributos' },
  ATRIBUTO_DUPLICADO: { status: 400, mensaje: 'No repitas el mismo dato adicional.', campo: 'atributos' },
  ATRIBUTO_VALOR_INVALIDO: { status: 400, mensaje: 'Revisá los datos adicionales: algún valor no corresponde a su tipo.', campo: 'atributos' },
  CURSO_NO_ENCONTRADO: { status: 404, mensaje: 'El curso elegido no existe o fue dado de baja.' },
  CURSO_SIN_CERTIFICADO: { status: 400, mensaje: 'Ese curso no otorga certificado. Cargalo sin curso, con sus datos.' },
  CURSO_NO_FINALIZADO: { status: 400, mensaje: 'Vas a poder cargar el certificado cuando termine el curso.' },
  CURSO_NO_EDITABLE: { status: 400, mensaje: 'El curso se elige al cargar el certificado. Para cambiarlo, dalo de baja y cargá otro.' },
  DATOS_DEL_CURSO: { status: 400, mensaje: 'El nombre, la entidad y la fecha salen del curso y no se pueden cambiar.' },
  CERTIFICADO_DUPLICADO: { status: 409, mensaje: 'Ya tenés un certificado de este curso pendiente o aprobado.' },
  NO_EDITABLE: { status: 422, mensaje: 'Un certificado aprobado no se puede editar. Podés darlo de baja y cargar otro.' },
  SIN_CAMBIOS: { status: 400, mensaje: 'No hay cambios para guardar.' },
  ESTADO_INVALIDO: { status: 400, mensaje: 'Estado inválido. Para filtrar: PENDIENTE, APROBADO o RECHAZADO; para revisar: APROBADO o RECHAZADO.' },
  // 409 como en /api/solicitudes-certificados: otra persona ya resolvió el certificado.
  ESTADO_NO_PENDIENTE: { status: 409, mensaje: 'Este certificado ya fue revisado.' },
  MOTIVO_REQUERIDO: { status: 400, mensaje: 'Para rechazar, escribí el motivo (hasta 2000 caracteres).', campo: 'motivo' },
  ID_INVALIDO: { status: 400, mensaje: 'El identificador no es válido.' },
  EL_NOMBRE_ES_REQUERIDO: { status: 400, mensaje: 'El nombre del atributo es obligatorio.' },
  TIPO_INVALIDO: { status: 400, mensaje: 'El tipo debe ser TEXTO, NUMERO, FECHA o BOOLEANO.' },
};

export function responderErrorCertificado(error: unknown, mensajeDefault: string): NextResponse {
  const codigo = error instanceof Error ? error.message : '';
  const conocido = ERRORES[codigo];
  if (conocido) {
    const { status, mensaje, campo } = conocido;
    return NextResponse.json({ error: mensaje, codigo, ...(campo ? { campo } : {}) }, { status });
  }
  // Prisma, base caída o desconocido: mismo tratamiento que cursos.
  return responderErrorCurso(error, mensajeDefault);
}
