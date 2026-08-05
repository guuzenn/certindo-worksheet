import type { Metadata } from 'next';
import { CompaniesView } from '@/components/companies-view';

export const metadata: Metadata = {
  title: 'Perusahaan Klien',
  description: 'Manajemen data perusahaan klien kalibrasi PT Certindonesia',
};

export default function CompaniesPage() {
  return <CompaniesView />;
}
