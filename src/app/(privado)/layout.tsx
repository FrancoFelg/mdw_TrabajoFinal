import { requireSession } from '@/lib/session';

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return children;
}
