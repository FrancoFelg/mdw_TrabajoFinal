"use client";

import { useEffect, useState } from "react";
import type { EstadoSalud } from "../types";
import styles from "./PanelSalud.module.css";

const INTERVALO_MS = 10_000;

// Uptime del proceso de Node. Como cada deploy reemplaza el container,
// "arriba hace X" es en la práctica "último deploy hace X".
function formatearDuracion(segundos: number): string {
  if (segundos < 60) return `${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `${minutos} min ${segundos % 60} s`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} h ${minutos % 60} min`;
  const dias = Math.floor(horas / 24);
  return `${dias} d ${horas % 24} h`;
}

type Lectura =
  | { fase: "cargando" }
  | { fase: "ok"; datos: EstadoSalud; hora: string }
  | { fase: "error"; mensaje: string; hora: string };

export function PanelSalud() {
  const [lectura, setLectura] = useState<Lectura>({ fase: "cargando" });

  useEffect(() => {
    let activo = true;

    async function consultar() {
      const hora = new Date().toLocaleTimeString();
      try {
        // 503 también trae JSON válido (status: degraded), por eso no se
        // corta por response.ok
        const respuesta = await fetch("/api/health", { cache: "no-store" });
        const datos = (await respuesta.json()) as EstadoSalud;
        if (activo) setLectura({ fase: "ok", datos, hora });
      } catch {
        if (activo)
          setLectura({ fase: "error", mensaje: "sin respuesta del servidor", hora });
      }
    }

    consultar();
    const timer = setInterval(consultar, INTERVALO_MS);
    return () => {
      activo = false;
      clearInterval(timer);
    };
  }, []);

  if (lectura.fase === "cargando") {
    return (
      <section className={styles.panel} aria-busy="true">
        <p className={styles.muted}>Consultando estado…</p>
      </section>
    );
  }

  if (lectura.fase === "error") {
    return (
      <section className={styles.panel} data-estado="degraded">
        <header className={styles.cabecera}>
          <span className={styles.indicador} aria-hidden="true" />
          <h2 className={styles.titulo}>Sin conexión</h2>
        </header>
        <p className={styles.muted}>
          {lectura.mensaje} · intentado a las {lectura.hora}
        </p>
      </section>
    );
  }

  const { datos, hora } = lectura;
  const sano = datos.status === "ok";

  return (
    <section className={styles.panel} data-estado={datos.status}>
      <header className={styles.cabecera}>
        <span className={styles.indicador} aria-hidden="true" />
        <h2 className={styles.titulo}>
          {sano ? "Todo en orden" : "Servicio degradado"}
        </h2>
      </header>

      <dl className={styles.datos}>
        <div className={styles.dato}>
          <dt>Base de datos</dt>
          <dd>
            {datos.db === "ok"
              ? `responde en ${datos.dbLatencyMs ?? "?"} ms`
              : "inaccesible"}
          </dd>
        </div>
        <div className={styles.dato}>
          <dt>Proceso arriba hace</dt>
          <dd className={styles.destacado}>
            {formatearDuracion(datos.uptimeSeconds)}
          </dd>
        </div>
        <div className={styles.dato}>
          <dt>Última consulta</dt>
          <dd>{hora}</dd>
        </div>
      </dl>

      <p className={styles.muted}>
        Cada deploy reemplaza el proceso: si el contador vuelve a cero, el CD
        acaba de publicar una versión nueva.
      </p>
    </section>
  );
}
