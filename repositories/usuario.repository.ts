import { db } from '../config/database';
import { Usuario, Persona, Rol } from '@prisma/client';

export interface CrearUsuarioDTO {
  nombreUsuario: string;
  passwordHash: string;
  rol?: Rol;
  persona: {
    nombre: string;
    apellido: string;
    fechaNac: Date;
    telefonos?: {
      tipo: string;
      numero: string;
    }[];
  };
}

export class UsuarioRepository {

  // Crear usuario junto con su registro de Persona y teléfonos opcionales
  async crear(data: CrearUsuarioDTO): Promise<Usuario> {
    return await db.usuario.create({
      data: {
        nombreUsuario: data.nombreUsuario,
        password: data.passwordHash,
        rol: data.rol || Rol.VOLUNTARIO,
        persona: {
          create: {
            nombre: data.persona.nombre,
            apellido: data.persona.apellido,
            fechaNac: data.persona.fechaNac,
            telefonos: data.persona.telefonos ? {
              createMany: {
                data: data.persona.telefonos
              }
            } : undefined
          }
        }
      },
      include: {
        persona: {
          include: {
            telefonos: true
          }
        }
      }
    });
  }

  // Buscar por nombre de usuario (para auth o validaciones)
  async findByNombreUsuario(nombreUsuario: string): Promise<Usuario | null> {
    return await db.usuario.findUnique({
      where: { nombreUsuario },
      include: {
        persona: true
      }
    });
  }

  // Buscar por ID con detalle de persona y teléfonos
  async findById(id: string) {
    return await db.usuario.findUnique({
      where: { id },
      include: {
        persona: {
          include: {
            telefonos: true
          }
        }
      }
    });
  }

  // Listar todos los usuarios
  async findAll() {
    return await db.usuario.findMany({
      select: {
        id: true,
        nombreUsuario: true,
        rol: true,
        creadoEn: true,
        persona: {
          select: {
            nombre: true,
            apellido: true,
            fechaNac: true,
            telefonos: true
          }
        }
      }
    });
  }

  // Actualizar rol del usuario
  async actualizarRol(id: string, nuevoRol: Rol): Promise<Usuario> {
    return await db.usuario.update({
      where: { id },
      data: { rol: nuevoRol }
    });
  }
}