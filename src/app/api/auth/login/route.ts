import { jsonPublico } from '@/lib/respuesta-publica';
import { NextRequest } from 'next/server';
import { AuthService } from '../../../../../services/auth.service';
import { sessionCookie } from '@/lib/session';

const authService = new AuthService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;
    const nombreUsuario = body.nombreUsuario ?? body.email;

    if (typeof nombreUsuario !== 'string' || typeof password !== 'string' || !nombreUsuario.trim() || !password) {
      return jsonPublico(
        { error: 'Debe ingresar nombreUsuario y password.' },
        { status: 400 }
      );
    }

    const respuesta = await authService.login(nombreUsuario, password);
    const response = jsonPublico(respuesta, { status: 200 });
    response.cookies.set('token', respuesta.token, sessionCookie);
    return response;
  } catch (error: any) {
    console.error('Error detallado en login:', error)

    if (error.message === 'CREDANCIALES_INVALIDAS') {
      return jsonPublico(
        { error: 'Usuario o contraseña incorrectos.' },
        { status: 401 }
      );
    }
    if (error.message === 'DEMASIADOS_INTENTOS') {
      return jsonPublico(
        { error: 'Demasiados intentos fallidos. Esperá unos minutos antes de volver a intentar.' },
        { status: 429 }
      );
    }
    return jsonPublico(
      { error: 'Error interno en el servidor.' },
      { status: 500 }
    );
  }

}
