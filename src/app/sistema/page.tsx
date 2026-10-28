import { Alert, Badge, Button, Input, Skeleton } from '@/components/ui';
import { Apariencia, TemaBoton } from '@/components/tema';
import { Asignado, CodigoCaso, EtapasCaso, IconoPrioridad, MarcaEstado, MarcaPrioridad, MarcaRevision } from '@/components/marcas';

export const metadata = { title: 'Sistema visual | Red de Apoyo' };

// Galería de piezas del pizarrón. Los datos son de ejemplo y no corresponden a personas reales.
const EJEMPLO = 'cmh0ejemplo0000000000k7q2';

export default function Sistema() {
  return <section className="formacion">
    <header className="pagina-cabecera"><h1>Sistema visual</h1><p className="muted">Piezas de la interfaz con datos de ejemplo.</p></header>
    <div className="galeria">

    <section className="bloque" aria-labelledby="s-prioridad"><h2 id="s-prioridad">Prioridad</h2>
      <div className="actions"><MarcaPrioridad prioridad="ROJO" detalle /><MarcaPrioridad prioridad="AMARILLO" detalle /><MarcaPrioridad prioridad="VERDE" detalle /></div>
    </section>

    <section className="bloque" aria-labelledby="s-estado"><h2 id="s-estado">Estados</h2>
      <div className="actions"><MarcaEstado estado="SIN_GESTIONAR" /><MarcaEstado estado="EN_CAMINO" /><MarcaEstado estado="GESTIONADA" /><MarcaEstado estado="CANCELADA" /></div>
      <div className="actions"><MarcaRevision estado="PENDIENTE" /><MarcaRevision estado="APROBADO" /><MarcaRevision estado="RECHAZADO" /><MarcaRevision estado="VENCIDO" /></div>
    </section>

    <section className="bloque" aria-labelledby="s-cinta"><h2 id="s-cinta">Código y asignado</h2>
      <div className="actions" style={{ alignItems: 'center' }}><CodigoCaso id={EJEMPLO} /><Asignado nombre={null} /><Asignado nombre="Voluntaria de ejemplo" /><Asignado nombre="Vos" propio /></div>
    </section>

    <section className="bloque" aria-labelledby="s-fila"><h2 id="s-fila">Fila de caso</h2>
      <ul className="filas">
        <li><span className="fila"><IconoPrioridad prioridad="ROJO" grande /><span className="fila-texto"><span className="fila-desc">Texto de ejemplo de un reporte largo que ocupa más de una línea para revisar cómo se corta en pantallas angostas de 375 píxeles.</span><span className="fila-meta"><CodigoCaso id={EJEMPLO} /> Rojo · hace 12 minutos · Provincia de ejemplo</span></span><span className="fila-fin"><Asignado nombre={null} /></span></span></li>
        <li><span className="fila"><IconoPrioridad prioridad="VERDE" grande /><span className="fila-texto"><span className="fila-desc">Otro reporte de ejemplo.</span><span className="fila-meta"><CodigoCaso id="cmh0ejemplo00000000000b3x9" /> Verde · hace 1 hora · Provincia de ejemplo</span></span><span className="fila-fin"><Asignado nombre="Nombre muy largo de ejemplo" /></span></span></li>
      </ul>
    </section>

    <section className="bloque" aria-labelledby="s-etapas"><h2 id="s-etapas">Etapas</h2>
      <EtapasCaso estado="EN_CAMINO" detalles={{ SIN_GESTIONAR: 'hace 20 minutos', EN_CAMINO: 'Vos' }} />
    </section>

    <section className="bloque" aria-labelledby="s-acciones"><h2 id="s-acciones">Acciones y campos</h2>
      <div className="actions"><Button>Principal</Button><Button className="button-secondary">Secundario</Button><Button className="button-peligro">Rechazar</Button><Button disabled>Guardando…</Button></div>
      <div className="field"><label htmlFor="ejemplo">Campo</label><Input id="ejemplo" placeholder="Texto de ayuda" /></div>
      <div className="field"><label htmlFor="invalido">Campo con error</label><Input id="invalido" aria-invalid="true" aria-describedby="error-campo" /><p id="error-campo" className="error-linea">Este campo es obligatorio.</p></div>
      <div className="actions"><Badge>Coordinador</Badge><span className="contador">12</span></div>
    </section>

    <section className="bloque" aria-labelledby="s-tema"><h2 id="s-tema">Tema</h2>
      <p className="muted">El botón del encabezado y el selector de Cuenta. Al cambiar, el tema nuevo se pinta en ola desde arriba a la izquierda.</p>
      <TemaBoton />
      <Apariencia inicial={null} />
    </section>
    <section className="bloque" aria-labelledby="s-vistas"><h2 id="s-vistas">Estados de una vista</h2>
      <div className="stack-chico"><Skeleton /><Skeleton /></div>
      <Alert><h2>No pudimos cargar los casos</h2><p>Probá de nuevo en unos segundos.</p></Alert>
      <div className="vacio"><h3>No hay casos libres</h3><p>Cuando alguien reporte una emergencia, va a aparecer acá.</p></div>
      <p className="habilitacion">Para tomar casos rojos necesitás al menos un certificado aprobado.</p>
      <p className="habilitacion habilitado">Tenés un certificado aprobado: podés tomar casos rojos.</p>
    </section>
    </div>
  </section>;
}
