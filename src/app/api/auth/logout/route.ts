import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/logout
export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json(
      { mensaje: 'Sesión cerrada correctamente.' },
      { status: 200 }
    );

    // Eliminar la cookie de sesión (ajusta 'token' por el nombre exacto de tu cookie)
    response.cookies.set('token', '', {
      httpOnly: true,
      expires: new Date(0), // Expiración en el pasado para forzar el borrado
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error en POST /api/auth/logout:', error);
    return NextResponse.json(
      { error: 'Error interno al cerrar sesión.' },
      { status: 500 }
    );
  }
}