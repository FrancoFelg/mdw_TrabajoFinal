import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../services/auth.service';

const authService = new AuthService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombreUsuario, password } = body;

    if (!nombreUsuario || !password) {
      return NextResponse.json(
        { error: 'Debe ingresar nombreUsuario y password.' },
        { status: 400 }
      );
    }

    const respuesta = await authService.login(nombreUsuario, password);
    return NextResponse.json(respuesta, { status: 200 });
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