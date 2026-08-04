'use client';

import { Button, cn } from '@certindo/ui';
import { Building2, ChevronDown, ClipboardList, FilePlus2, Gauge, LayoutDashboard, Menu, Search, Settings, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Brand } from './brand';

const navigation = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Data Kalibrasi', href: '/calibrations', icon: ClipboardList },
  { label: 'Kalibrasi Baru', href: '/calibrations/new', icon: FilePlus2 },
  { label: 'Template Instrumen', href: '/instrument-forms', icon: Gauge },
  { label: 'Perusahaan', href: '/companies', icon: Building2 },
  { label: 'Pengguna', href: '/users', icon: Users },
  { label: 'Pengaturan', href: '/settings', icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    if (!window.localStorage.getItem('certindo_access_token')) router.replace('/login');
  }, [router]);
  const current = navigation.find((item) => pathname.startsWith(item.href));
  function logout(): void {
    window.localStorage.removeItem('certindo_access_token');
    router.replace('/login');
  }

  const sidebar = (
    <>
      <div className="flex h-[88px] items-center border-b border-white/10 px-6"><Brand inverse /></div>
      <nav aria-label="Navigasi utama" className="flex-1 space-y-1.5 px-3 py-6">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Menu utama</p>
        {navigation.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)} className={cn('group flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition', active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white')}>
              <span className={cn('h-5 w-0.5 rounded-full', active ? 'bg-[#D71920]' : 'bg-transparent')} />
              <item.icon className={cn('size-[18px]', active ? 'text-white' : 'text-slate-400 group-hover:text-white')} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4 text-xs leading-5 text-slate-400">Certindo Worksheet<br />Versi 0.1.0</div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F5F7F9]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col bg-[#183247] lg:flex">{sidebar}</aside>
      {drawerOpen && <button aria-label="Tutup navigasi" className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" onClick={() => setDrawerOpen(false)} />}
      <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#183247] transition-transform lg:hidden', drawerOpen ? 'translate-x-0' : '-translate-x-full')}>
        <button aria-label="Tutup menu" className="absolute right-3 top-3 rounded-lg p-2 text-slate-300 hover:bg-white/10" onClick={() => setDrawerOpen(false)}><X className="size-5" /></button>
        {sidebar}
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 border-b border-[#E3E8ED] bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex h-[88px] max-w-[1180px] items-center gap-4 px-4 sm:px-6">
            <Button aria-label="Buka menu" variant="ghost" className="px-2 lg:hidden" onClick={() => setDrawerOpen(true)}><Menu className="size-5" /></Button>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400">Beranda <span className="px-1">/</span> {current?.label ?? 'Halaman'}</p>
              <h1 className="mt-1 truncate font-heading text-xl font-extrabold text-[#183247] sm:text-2xl">{current?.label ?? 'Certindo Worksheet'}</h1>
            </div>
            <label className="relative hidden w-56 xl:block">
              <Search className="absolute left-3 top-3 size-4 text-slate-400" />
              <input aria-label="Cari" className="h-10 w-full rounded-[10px] border bg-[#F8FAFB] pl-9 pr-3 text-sm outline-none focus:border-[#1F5F8B]" placeholder="Cari data…" />
            </label>
            <button onClick={logout} className="flex items-center gap-3 rounded-[10px] p-1.5 text-left hover:bg-slate-50" title="Klik untuk keluar">
              <span className="grid size-9 place-items-center rounded-full bg-[#EEF5FA] text-xs font-bold text-[#1F5F8B]">AC</span>
              <span className="hidden sm:block"><span className="block text-sm font-semibold text-[#2D3A45]">Admin Certindo</span><span className="block text-xs text-slate-400">Administrator</span></span>
              <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
