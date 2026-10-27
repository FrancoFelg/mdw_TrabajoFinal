import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../services/auth.service';
import { sessionCookie } from '@/lib/session';

const authService = new AuthService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombreUsuario, password } = body;

    if (typeof nombreUsuario !== 'string' || typeof password !== 'string' || !nombreUsuario.trim() || !password) {
      return NextResponse.json(
        { error: 'Debe ingresar nombreUsuario y password.' },
        { status: 400 }
      );
    }

    const respuesta = await authService.login(nombreUsuario, password);
    const response = NextResponse.json(respuesta, { status: 200 });
    response.cookies.set('token', respuesta.token, sessionCookie);
    return response;
  } catch (error: any) {
    console.error('Error detallado en login:', error)

    if (error.message === 'CREDANCIALES_INVALIDAS') {
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos.' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Error interno en el servidor.' },
      { status: 500 }
    );
  }

}
