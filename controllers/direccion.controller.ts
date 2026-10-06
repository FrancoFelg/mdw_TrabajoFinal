import { GeocodingService } from '../services/geocoding.service';

export class DireccionController {
  private service: GeocodingService;

  constructor() {
    this.service = new GeocodingService();
  }

  // GET /api/direcciones/sugerencias — autocompletado de direcciones
  async sugerir(texto: string, sessionToken?: string) {
    return await this.service.sugerirDirecciones(texto, sessionToken);
  }
}
