import { Rol } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        nombreUsuario: string;
        rol: Rol;
      };
    }
  }
}