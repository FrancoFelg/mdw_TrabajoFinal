import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Rol } from '@prisma/client';

interface JwtPayloadCustom {
  id: string;
  nombreUsuario: string;
  rol: Rol;
}

export const autenticarJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso denegado. Token no provisto.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'secret_fallback';
    const decoded = jwt.verify(token, secret) as JwtPayloadCustom;

    req.user = {
      id: decoded.id,
      nombreUsuario: decoded.nombreUsuario,
      rol: decoded.rol,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};