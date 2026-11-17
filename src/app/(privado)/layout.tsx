import { Marco } from '@/components/marco';
import { getSession } from '@/lib/session';

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  // Cada página exige sesión con su destino. Un redirect aquí pierde el parámetro next.
  const usuario = await getSession();
  if (!usuario) return children;
  return <Marco usuario={usuario}>{children}</Marco>;
}
