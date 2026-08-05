import type { Metadata } from 'next';
import { SettingsView } from '@/components/settings-view';

export const metadata: Metadata = {
  title: 'Pengaturan Profil & Keamanan',
  description: 'Pengaturan profil akun dan keamanan kata sandi pengguna PT Certindonesia',
};

export default function SettingsPage() {
  return <SettingsView />;
}
