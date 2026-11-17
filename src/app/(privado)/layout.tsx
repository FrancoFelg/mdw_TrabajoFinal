export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  // Cada página exige sesión con su destino. Un redirect aquí pierde el parámetro next.
  return children;
}
