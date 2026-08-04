'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@certindo/ui';
import { ArrowRight, CheckCircle2, ClipboardClock, ClipboardList, FilePlus2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { formatIndonesianDate } from '@/lib/format';

interface RecentRecord {
  id: string;
  recordNumber: string;
  certificateNumber: string | null;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'CONFIRMED' | 'POSTPONED' | 'COMPLETED';
  updatedAt: string;
  company: { name: string };
  instrumentForm: { name: string; code: string };
}
interface Summary { counts: { total: number; draft: number; underReview: number; completed: number }; recent: RecentRecord[] }

const statusLabel = { DRAFT: 'Draft', UNDER_REVIEW: 'Dalam Pemeriksaan', CONFIRMED: 'Terkonfirmasi', POSTPONED: 'Ditunda', COMPLETED: 'Selesai' } as const;
const statusVariant = { DRAFT: 'neutral', UNDER_REVIEW: 'warning', CONFIRMED: 'purple', POSTPONED: 'danger', COMPLETED: 'success' } as const;

export function DashboardView() {
  const query = useQuery({ queryKey: ['dashboard-summary'], queryFn: () => apiRequest<Summary>('/dashboard/summary') });
  const counts = query.data?.counts ?? { total: 0, draft: 0, underReview: 0, completed: 0 };
  const cards = [
    { label: 'Total Kalibrasi', value: counts.total, note: 'Seluruh rekaman', icon: ClipboardList, color: 'bg-[#EEF5FA] text-[#1F5F8B]' },
    { label: 'Draft', value: counts.draft, note: 'Perlu dilengkapi', icon: ClipboardClock, color: 'bg-slate-100 text-slate-600' },
    { label: 'Dalam Pemeriksaan', value: counts.underReview, note: 'Menunggu reviewer', icon: RefreshCw, color: 'bg-amber-50 text-amber-700' },
    { label: 'Selesai', value: counts.completed, note: 'Dokumen final', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 rounded-xl border bg-white p-6 shadow-[0_5px_18px_rgba(24,50,71,0.06)] sm:flex-row sm:items-center">
        <div><p className="text-sm font-semibold text-[#D71920]">Ringkasan hari ini</p><h2 className="mt-1 font-heading text-2xl font-extrabold text-[#183247]">Selamat datang di Certindo Worksheet</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Pantau pekerjaan kalibrasi dan lanjutkan data yang membutuhkan tindakan.</p></div>
        <Link href="/calibrations/new" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#D71920] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#B9151B]">
          <FilePlus2 className="size-4" /> Buat Kalibrasi Baru
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => <Card key={item.label}><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm font-medium text-slate-500">{item.label}</p><p className="mt-2 font-heading text-3xl font-extrabold text-[#183247]">{query.isLoading ? '—' : item.value}</p><p className="mt-1 text-xs text-slate-400">{item.note}</p></div><span className={`grid size-10 place-items-center rounded-[10px] ${item.color}`}><item.icon className="size-5" /></span></CardContent></Card>)}
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between border-b py-5"><div><CardTitle>Aktivitas Terbaru</CardTitle><p className="mt-1 text-sm text-slate-400">Rekaman yang terakhir diperbarui</p></div><Link href="/calibrations" className="flex items-center gap-1 text-sm font-semibold text-[#1F5F8B] hover:underline">Lihat semua <ArrowRight className="size-4" /></Link></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {query.isError ? <div className="m-5 rounded-[10px] border border-red-100 bg-[#FDEBEC] p-4 text-sm text-[#B9151B]">Data belum dapat dimuat. Pastikan API dan database sudah berjalan.</div> : (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#F8FAFB] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-6 py-3.5 font-semibold">No. Rekaman</th><th className="px-5 py-3.5 font-semibold">Instrumen</th><th className="px-5 py-3.5 font-semibold">Perusahaan</th><th className="px-5 py-3.5 font-semibold">Status</th><th className="px-6 py-3.5 text-right font-semibold">Diperbarui</th></tr></thead>
              <tbody className="divide-y divide-[#E3E8ED]">
                {query.data?.recent.map((record) => <tr key={record.id} className="hover:bg-[#F8FAFB]"><td className="px-6 py-4 font-semibold text-[#183247]">{record.recordNumber}</td><td className="px-5 py-4"><span className="block font-medium text-[#2D3A45]">{record.instrumentForm.name}</span><span className="text-xs text-slate-400">{record.instrumentForm.code}</span></td><td className="px-5 py-4">{record.company.name}</td><td className="px-5 py-4"><Badge variant={statusVariant[record.status]}>{statusLabel[record.status]}</Badge></td><td className="px-6 py-4 text-right text-slate-400">{formatIndonesianDate(record.updatedAt)}</td></tr>)}
                {!query.isLoading && !query.data?.recent.length && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Belum ada aktivitas kalibrasi.</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
