import { Request, Response } from 'express';
import { UsuarioService } from '../services/usuario.service';

export class UsuarioController {
  private usuarioService: UsuarioService;

  constructor() {
    this.usuarioService = new UsuarioService();
  }

  // POST /api/usuarios
  registrar = async (req: Request, res: Response) => {
    try {
      const { nombreUsuario, password, rol, persona } = req.body;

      if (!nombreUsuario || !password || !persona?.nombre || !persona?.apellido || !persona?.fechaNac) {
        return res.status(400).json({ error: 'Faltan campos obligatorios para el registro.' });
      }

      const nuevoUsuario = await this.usuarioService.registrarUsuario({
        nombreUsuario,
        password,
        rol,
        persona: {
          ...persona,
          fechaNac: new Date(persona.fechaNac)
        }
      });

      return res.status(201).json(nuevoUsuario);
    } catch (error: any) {
      if (error.message === 'NOMBRE_USUARIO_EXISTENTE') {
        return res.status(409).json({ error: 'El nombre de usuario ya está registrado.' });
      }
      return res.status(500).json({ error: 'Error interno al registrar el usuario.' });
    }
  };

  // GET /api/usuarios/me
  obtenerPerfilMe = async (req: Request, res: Response) => {
    try {
      const usuarioId = req.user?.id;
      if (!usuarioId) {
        return res.status(401).json({ error: 'Usuario no autenticado.' });
      }

      const perfil = await this.usuarioService.obtenerPerfil(usuarioId);
      return res.status(200).json(perfil);
    } catch (error: any) {
      if (error.message === 'USUARIO_NO_ENCONTRADO') {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
      return res.status(500).json({ error: 'Error al obtener el perfil.' });
    }
  };

  // GET /api/usuarios
  listar = async (req: Request, res: Response) => {
    try {
      const usuarios = await this.usuarioService.listarUsuarios();
      return res.status(200).json(usuarios);
    } catch (error) {
      return res.status(500).json({ error: 'Error al obtener la lista de usuarios.' });
    }
  };

  // PATCH /api/usuarios/:id/rol
  actualizarRol = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { rol } = req.body;

      if (!rol) {
        return res.status(400).json({ error: 'El campo rol es requerido.' });
      }

      const usuarioActualizado = await this.usuarioService.cambiarRol(id, rol);
      return res.status(200).json(usuarioActualizado);
    } catch (error: any) {
      if (error.message === 'USUARIO_NO_ENCONTRADO') {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
      return res.status(500).json({ error: 'Error al actualizar el rol.' });
    }
  };
}