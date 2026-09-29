import { PanelSalud } from "@/features/salud/components/PanelSalud";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Metodologías de Desarrollo Web · UAI</p>
          <h1>mdw</h1>
          <p>
            Gestión de cursos y certificados. Esta página muestra el estado en
            vivo del servicio.
          </p>
        </header>
        <PanelSalud />
      </main>
    </div>
  );
}
