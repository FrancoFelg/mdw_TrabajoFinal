import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // POST /api/auth/login
  login = async (req: Request, res: Response) => {
    try {
      const { nombreUsuario, password } = req.body;

      if (!nombreUsuario || !password) {
        return res.status(400).json({ error: 'Debe ingresar nombreUsuario y password.' });
      }

      const respuesta = await this.authService.login(nombreUsuario, password);
      return res.status(200).json(respuesta);
    } catch (error: any) {
      if (error.message === 'CREDANCIALES_INVALIDAS') {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
      }
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
  };
}