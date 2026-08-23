import { z } from 'zod';

// ENUMS & VALORES CONSTANTES
export const EmergenciaPrioridadEnum = z.enum(['ROJO', 'AMARILLO', 'VERDE']);
export type EmergenciaPrioridadType = z.infer<typeof EmergenciaPrioridadEnum>;

export const EmergenciaEstadoEnum = z.enum([
  'SIN GESTIONAR',
  'EN CAMINO',
  'GESTIONADA',
  'CANCELADA',
]);
export type EmergenciaEstadoType = z.infer<typeof EmergenciaEstadoEnum>;

export const UbicacionTipoEnum = z.enum([
  'CALLE',
  'CIUDAD',
  'PROVINCIA',
  'PAIS',
]);
export type UbicacionTipoType = z.infer<typeof UbicacionTipoEnum>;

export const CertificadoEstadoEnum = z.enum([
  'PENDIENTE',
  'APROBADO',
  'RECHAZADO',
  'VENCIDO',
]);
export type CertificadoEstadoType = z.infer<typeof CertificadoEstadoEnum>;


// SCHEMAS DE ENTIDADES

export const RolSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1, 'El nombre del rol es requerido'),
  descripcion: z.string().optional(),
});
export type Rol = z.infer<typeof RolSchema>;

export const PersonaSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  dniPasaporte: z.string().min(5, 'El documento de identidad no es válido'),
  telefono: z.string().min(6, 'El teléfono debe ser válido'),
  email: z.string().email('El correo electrónico no es válido'),
  createdAt: z.date().default(() => new Date()),
});
export type Persona = z.infer<typeof PersonaSchema>;

export const UsuarioSchema = z.object({
  id: z.string().uuid(),
  personaId: z.string().uuid('ID de persona inválido'),
  rolId: z.string().uuid('ID de rol inválido'),
  passwordHash: z.string().min(1, 'El hash de contraseña es requerido'),
  activo: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
});
export type Usuario = z.infer<typeof UsuarioSchema>;

export const UbicacionTipoSchema = z.object({
  id: z.string().uuid(),
  nombre: UbicacionTipoEnum,
});
export type UbicacionTipo = z.infer<typeof UbicacionTipoSchema>;

export const UbicacionSchema = z.object({
  id: z.string().uuid(),
  tipoId: z.string().uuid(),
  latitud: z.number().min(-90).max(90, 'Latitud fuera de rango (-90 a 90)'),
  longitud: z.number().min(-180).max(180, 'Longitud fuera de rango (-180 a 180)'),
  direccion: z.string().min(3, 'La dirección es requerida'),
  ciudad: z.string().min(1, 'La ciudad es requerida'),
  provincia: z.string().optional(),
  referencia: z.string().optional(),
});
export type Ubicacion = z.infer<typeof UbicacionSchema>;

export const EmergenciaPrioridadSchema = z.object({
  id: z.string().uuid(),
  nivel: EmergenciaPrioridadEnum,
  descripcion: z.string().optional(),
});
export type EmergenciaPrioridad = z.infer<typeof EmergenciaPrioridadSchema>;

export const EmergenciaEstadoSchema = z.object({
  id: z.string().uuid(),
  estado: EmergenciaEstadoEnum,
});
export type EmergenciaEstado = z.infer<typeof EmergenciaEstadoSchema>;

export const EmergenciaSchema = z.object({
  id: z.string().uuid(),
  descripcion: z.string().min(5, 'Describe brevemente la situación de la emergencia'),
  fotoUrl: z.string().url('URL de foto inválida').optional().nullable(),
  prioridad: EmergenciaPrioridadEnum.default('VERDE'),
  estado: EmergenciaEstadoEnum.default('SIN GESTIONAR'),
  ubicacionId: z.string().uuid('ID de ubicación inválido'),
  reportadoPorPersonaId: z.string().uuid().optional().nullable(), // Nullable si fue anónimo
  asignadoAUsuarioId: z.string().uuid().optional().nullable(),
  observacionesCierre: z.string().optional().nullable(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Emergencia = z.infer<typeof EmergenciaSchema>;

export const CursoAtributoSchema = z.object({
  id: z.string().uuid(),
  clave: z.string().min(1, 'La clave del atributo es requerida'), // Ej: "Categoría"
  valor: z.string().min(1, 'El valor del atributo es requerido'), // Ej: "Primeros Auxilios"
});
export type CursoAtributo = z.infer<typeof CursoAtributoSchema>;

export const CursoSchema = z.object({
  id: z.string().uuid(),
  titulo: z.string().min(3, 'El título del curso es requerido'),
  descripcion: z.string().min(10, 'Proporciona una descripción detallada del curso'),
  horasLectivas: z.number().int().positive('Las horas lectivas deben ser un número positivo'),
});
export type Curso = z.infer<typeof CursoSchema>;

export const CursoRelAtributoSchema = z.object({
  cursoId: z.string().uuid(),
  atributoId: z.string().uuid(),
});
export type CursoRelAtributo = z.infer<typeof CursoRelAtributoSchema>;

export const CertificadoEstadoSchema = z.object({
  id: z.string().uuid(),
  estado: CertificadoEstadoEnum,
});
export type CertificadoEstado = z.infer<typeof CertificadoEstadoSchema>;

export const CertificadoSchema = z.object({
  id: z.string().uuid(),
  personaId: z.string().uuid('ID de persona inválido'),
  cursoId: z.string().uuid('ID de curso inválido'),
  estado: CertificadoEstadoEnum.default('PENDIENTE'),
  archivoUrl: z.string().url('URL del archivo adjunto inválida'),
  motivoRechazo: z.string().optional().nullable(),
  fechaEmision: z.date(),
  fechaVencimiento: z.date().optional().nullable(),
  createdAt: z.date().default(() => new Date()),
});
export type Certificado = z.infer<typeof CertificadoSchema>;


// SCHEMAS PARA FORMULARIOS / DTOs

// DTO para reportar emergencia pública (RF/H1)
export const CrearEmergenciaDTO = EmergenciaSchema.pick({
  descripcion: true,
  fotoUrl: true,
}).extend({
  ubicacion: UbicacionSchema.omit({ id: true, tipoId: true }),
});
export type CrearEmergenciaInput = z.infer<typeof CrearEmergenciaDTO>;

// DTO para subir certificados (RF/H2)
export const CargarCertificadoDTO = CertificadoSchema.pick({
  cursoId: true,
  archivoUrl: true,
  fechaEmision: true,
  fechaVencimiento: true,
});
export type CargarCertificadoInput = z.infer<typeof CargarCertificadoDTO>;