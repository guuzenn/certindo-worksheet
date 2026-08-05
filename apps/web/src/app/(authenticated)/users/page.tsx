import type { Metadata } from 'next';
import { UsersView } from '@/components/users-view';

export const metadata: Metadata = {
  title: 'Pengguna & Hak Akses',
  description: 'Manajemen pengguna dan peran hak akses staf PT Certindonesia',
};

export default function UsersPage() {
  return <UsersView />;
}
