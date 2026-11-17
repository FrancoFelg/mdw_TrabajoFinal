import { UsuarioRepository } from '../repositories/usuario.repository';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Freno por cuenta contra fuerza bruta: tras MAX_FALLOS seguidos, la cuenta espera VENTANA_MS.
// Vive en memoria del proceso (un solo contenedor); el límite por IP lo aplica nginx.
const MAX_FALLOS = 10;
const VENTANA_MS = 15 * 60 * 1000;
const MAX_CUENTAS = 10_000;
const fallos = new Map<string, { cantidad: number; vence: number }>();

function bloqueada(clave: string) {
  const registro = fallos.get(clave);
  if (registro && registro.vence <= Date.now()) fallos.delete(clave);
  return (fallos.get(clave)?.cantidad ?? 0) >= MAX_FALLOS;
}

function anotarFallo(clave: string) {
  if (fallos.size >= MAX_CUENTAS && !fallos.has(clave)) {
    const ahora = Date.now();
    for (const [k, v] of fallos) if (v.vence <= ahora) fallos.delete(k);
    if (fallos.size >= MAX_CUENTAS) fallos.clear();
  }
  const registro = fallos.get(clave) ?? { cantidad: 0, vence: Date.now() + VENTANA_MS };
  registro.cantidad++;
  fallos.set(clave, registro);
}

export class AuthService {
  private usuarioRepo: UsuarioRepository;

  constructor() {
    this.usuarioRepo = new UsuarioRepository();
  }

  async login(nombreUsuario: string, passwordPlano: string) {
    // Un identificador que no existe se cuenta por el texto ingresado; una cuenta existente, por su id,
    // porque la misma cuenta responde a usuario, email y variantes que la base compara como iguales.
    const claveEntrada = `entrada:${nombreUsuario.trim().toLowerCase()}`;
    if (bloqueada(claveEntrada)) throw new Error('DEMASIADOS_INTENTOS');

    // 1. Verificar si el usuario existe
    const usuario = await this.usuarioRepo.findParaLogin(nombreUsuario.trim());
    if (!usuario) {
      anotarFallo(claveEntrada);
      throw new Error('CREDANCIALES_INVALIDAS');
    }
    const clave = `cuenta:${usuario.id}`;
    if (bloqueada(clave)) throw new Error('DEMASIADOS_INTENTOS');

    // 2. Verificar la contraseña
    const passwordValida = await bcrypt.compare(passwordPlano, usuario.password);
    if (!passwordValida) {
      anotarFallo(clave);
      throw new Error('CREDANCIALES_INVALIDAS');
    }
    fallos.delete(clave);

    // 3. Generar el Token JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET_NO_CONFIGURADO');
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
