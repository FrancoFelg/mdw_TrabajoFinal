import { Phone } from 'lucide-react';

// Siempre visible al reportar (DESIGN.md, pantalla 01): la red de voluntarios no reemplaza
// a los servicios de emergencia, y quien reporta tiene que saber a quién llamar primero.
export function LlamarEmergencias() {
  return <p className="llamar">
    <Phone aria-hidden="true" size={20} />
    <span>Si hay riesgo de vida, llamá ya al <a href="tel:107" aria-label="Llamar al 107">107</a> o
      al <a href="tel:911" aria-label="Llamar al 911">911</a>.</span>
  </p>;
}
