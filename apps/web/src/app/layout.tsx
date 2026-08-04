import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import './globals.css';

const bodyFont = Be_Vietnam_Pro({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });
const headingFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-heading' });

export const metadata: Metadata = {
  title: { default: 'Certindo Worksheet', template: '%s | Certindo Worksheet' },
  description: 'Sistem manajemen lembar kerja kalibrasi PT Certindonesia',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
