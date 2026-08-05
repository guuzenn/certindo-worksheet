import type { Metadata } from 'next';
import { InstrumentFormsView } from '@/components/instrument-forms-view';

export const metadata: Metadata = {
  title: 'Template Instrumen',
  description: 'Katalog master template instrumen lembar kerja kalibrasi Certindo',
};

export default function InstrumentFormsPage() {
  return <InstrumentFormsView />;
}
