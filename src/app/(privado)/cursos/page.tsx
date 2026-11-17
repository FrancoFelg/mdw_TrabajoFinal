import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { CertificadoEstado } from '@prisma/client';
import { requireSession } from '@/lib/session';
import { esCoordinacionVigente } from '@/lib/actor-actual';
import { aVistaCurso } from '@/lib/cursos-vista';
import { CursosListado } from '@/components/cursos-listado';
import { FormacionPestanas } from '@/components/formacion-pestanas';
import { SinDatos } from '@/components/sin-datos';
import { CursoService } from '../../../../services/curso.service';
import { db } from '../../../../config/database';

export const metadata = { title: 'Cursos | Red de Apoyo' };

export default async function Cursos() {
  const sesion = await requireSession('/cursos');
  const [coordinacion, cursos, propios] = await Promise.all([
    esCoordinacionVigente(sesion.id),
    new CursoService().listar(),
    // Certificados activos de la persona por curso: no se carga otro mientras haya uno pendiente o aprobado.
    db.certificado.findMany({
      where: { usuarioId: sesion.id, cursoId: { not: null }, fechaEliminacion: null, estado: { in: ['PENDIENTE', 'APROBADO'] } },
      select: { cursoId: true, estado: true },
    }),
  ]);
  const mios: Record<string, CertificadoEstado> = Object.fromEntries(propios.map(c => [c.cursoId!, c.estado]));
  const nuevo = coordinacion && <Link className="button button-chico" href="/cursos/nuevo"><Plus aria-hidden="true" size={18} />Nuevo curso</Link>;

  return <section className="stack">
    <FormacionPestanas actual="cursos" coordinacion={coordinacion} />
    <header className="pagina-cabecera">
      <h1>Cursos</h1>
      <p className="muted">Si hiciste un curso que otorga certificado, cargalo desde acá: solo tenés que subir el archivo.</p>
      {nuevo && <div className="actions">{nuevo}</div>}
    </header>
    {cursos.length
      ? <CursosListado cursos={cursos.map(aVistaCurso)} coordinacion={coordinacion} mios={mios} />
      : <SinDatos titulo="Todavía no hay cursos.">
        {coordinacion
          ? <><p>Creá el primero para que el equipo pueda cargar sus certificados.</p><div className="actions">{nuevo}</div></>
          : <p>Cuando coordinación cargue cursos, vas a verlos acá. Mientras tanto, podés <Link href="/certificados/nuevo">cargar un certificado con sus datos</Link>.</p>}
      </SinDatos>}
  </section>;
}
