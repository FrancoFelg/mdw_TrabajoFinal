import { Marco } from '@/components/marco';
import { getSession } from '@/lib/session';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  return <Marco usuario={await getSession()}>{children}</Marco>;
}
