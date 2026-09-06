import { UsuarioRepository, type CrearUsuarioDTO } from '../repositories/usuario.repository';
import { Rol } from '@prisma/client';
import bcrypt from 'bcrypt';

export class UsuarioService {
  private usuarioRepo: UsuarioRepository;

  constructor() {
    this.usuarioRepo = new UsuarioRepository();
  }

  async registrarUsuario(dto: Omit<CrearUsuarioDTO, 'passwordHash'> & { password: string }) {
    // 1. Verificar si el nombre de usuario ya existe
    const usuarioExistente = await this.usuarioRepo.findByNombreUsuario(dto.nombreUsuario);
    if (usuarioExistente) {
      throw new Error('NOMBRE_USUARIO_EXISTENTE');
    }

    // 2. Hashear la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // 3. Crear el usuario en la BD
    const nuevoUsuario = await this.usuarioRepo.crear({
      nombreUsuario: dto.nombreUsuario,
      passwordHash,
      rol: dto.rol,
      persona: dto.persona
    });

    // Omitir la contraseña en la respuesta
    const { password, ...usuarioSinPassword } = nuevoUsuario;
    return usuarioSinPassword;
  }

  async obtenerPerfil(usuarioId: string) {
    const usuario = await this.usuarioRepo.findById(usuarioId);
    if (!usuario) {
      throw new Error('USUARIO_NO_ENCONTRADO');
    }

    const { password, ...usuarioSinPassword } = usuario;
    return usuarioSinPassword;
  }

  async listarUsuarios() {
    return await this.usuarioRepo.findAll();
  }

  async cambiarRol(usuarioId: string, nuevoRol: Rol) {
    const usuario = await this.usuarioRepo.findById(usuarioId);
    if (!usuario) {
      throw new Error('USUARIO_NO_ENCONTRADO');
    }

    return await this.usuarioRepo.actualizarRol(usuarioId, nuevoRol);
  }
}