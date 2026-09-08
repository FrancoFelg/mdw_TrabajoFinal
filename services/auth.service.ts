import { UsuarioRepository } from '../repositories/usuario.repository';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class AuthService {
  private usuarioRepo: UsuarioRepository;

  constructor() {
    this.usuarioRepo = new UsuarioRepository();
  }

  async login(nombreUsuario: string, passwordPlano: string) {
    // 1. Verificar si el usuario existe
    const usuario = await this.usuarioRepo.findByNombreUsuario(nombreUsuario);
    if (!usuario) {
      throw new Error('CREDANCIALES_INVALIDAS');
    }

    // 2. Verificar la contraseña
    const passwordValida = await bcrypt.compare(passwordPlano, usuario.password);
    if (!passwordValida) {
      throw new Error('CREDANCIALES_INVALIDAS');
    }

    // 3. Generar el Token JWT
    const secret = process.env.JWT_SECRET || 'secret_fallback';
    const token = jwt.sign(
      {
        id: usuario.id,
        nombreUsuario: usuario.nombreUsuario,
        rol: usuario.rol,
      },
      secret,
      { expiresIn: '8h' }
    );

    return {
      token,
      usuario: {
        id: usuario.id,
        nombreUsuario: usuario.nombreUsuario,
        rol: usuario.rol,
      },
    };
  }
}