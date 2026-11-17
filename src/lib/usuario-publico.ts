// Lista explícita para evitar exponer credenciales, incluso en relaciones anidadas.
export const usuarioPublicoSelect = {
  id: true, nombreUsuario: true, email: true, rol: true, personaId: true, creadoEn: true,
} as const;
