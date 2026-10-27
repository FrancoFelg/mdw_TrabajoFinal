import type { ReactNode } from 'react';
import { Card } from './ui';

export function SinDatos({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <Card className="empty"><h2>{titulo}</h2><div>{children}</div></Card>;
}
