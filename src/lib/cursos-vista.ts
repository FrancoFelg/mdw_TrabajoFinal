// Forma serializable que reciben los componentes de cursos.
export type CursoVista = {
  id: string;
  titulo: string;
  descripcion: string;
  fechaDesde: string;
  fechaHasta: string;
  horas: number | null;
  certificadoNombre: string | null;
  certificadoEmisor: string | null;
  atributos: { campoId: string; nombre: string; tipo: string; dato: string }[];
};

type CursoDb = {
  id: string; titulo: string; descripcion: string; fechaDesde: Date; fechaHasta: Date; horas: number | null;
  certificadoNombre: string | null; certificadoEmisor: string | null;
  cursosRelAtributos: { campoId: string; dato: string; campos: { nombre: string; tipo: string } }[];
};

export function aVistaCurso(c: CursoDb): CursoVista {
  return {
    id: c.id,
    titulo: c.titulo,
    descripcion: c.descripcion,
    fechaDesde: c.fechaDesde.toISOString(),
    fechaHasta: c.fechaHasta.toISOString(),
    horas: c.horas,
    certificadoNombre: c.certificadoNombre,
    certificadoEmisor: c.certificadoEmisor,
    atributos: c.cursosRelAtributos.map((r) => ({ campoId: r.campoId, nombre: r.campos.nombre, tipo: r.campos.tipo, dato: r.dato })),
  };
}

export const otorgaCertificado = (c: Pick<CursoVista, 'certificadoNombre' | 'certificadoEmisor'>) => Boolean(c.certificadoNombre && c.certificadoEmisor);

// Los cursos guardan días a medianoche UTC: se muestran y comparan en UTC para no correrse un día.
export const fechaCurso = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });

const hoyAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
export const terminado = (c: Pick<CursoVista, 'fechaHasta'>) => c.fechaHasta.slice(0, 10) <= hoyAR();
