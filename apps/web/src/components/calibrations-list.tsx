'use client';

import type { CalibrationRecordSummary, CalibrationStatus } from '@certindo/types';
import { Badge, Button, Card, CardContent } from '@certindo/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePlus2, Pencil, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { apiRequest } from '@/lib/api';
import { formatIndonesianDate } from '@/lib/format';

const statusLabel: Record<CalibrationStatus, string> = {
  DRAFT: 'Draft', UNDER_REVIEW: 'Dalam Pemeriksaan', CONFIRMED: 'Terkonfirmasi', POSTPONED: 'Ditunda', COMPLETED: 'Selesai',
};
const statusVariant = { DRAFT: 'neutral', UNDER_REVIEW: 'warning', CONFIRMED: 'purple', POSTPONED: 'danger', COMPLETED: 'success' } as const;

export function CalibrationsList() {
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const queryString = new URLSearchParams({ ...(search ? { search } : {}), ...(status ? { status } : {}) }).toString();
  const query = useQuery({
    queryKey: ['calibrations', search, status],
    queryFn: () => apiRequest<CalibrationRecordSummary[]>(`/calibrations${queryString ? `?${queryString}` : ''}`),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiRequest<{ id: string }>(`/calibrations/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['calibrations'] }),
  });

  function removeDraft(record: CalibrationRecordSummary): void {
    if (window.confirm(`Hapus draft ${record.recordNumber}?`)) remove.mutate(record.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <p className="max-w-2xl text-sm leading-6 text-slate-500">Kelola seluruh rekaman kalibrasi dari draft sampai dokumen selesai.</p>
        <Link href="/calibrations/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#D71920] px-5 text-sm font-semibold text-white hover:bg-[#B9151B]"><FilePlus2 className="size-4" /> Kalibrasi Baru</Link>
      </div>
      <Card>
        <CardContent className="p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <label className="relative"><Search className="absolute left-3.5 top-3.5 size-4 text-slate-400" /><input className="h-11 w-full rounded-[10px] border border-[#DDE5EA] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#1F5F8B]" placeholder="Cari nomor atau perusahaan..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            <select className="h-11 rounded-[10px] border border-[#DDE5EA] bg-white px-3.5 text-sm text-[#2D3A45] outline-none focus:border-[#1F5F8B]" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Semua status</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          {query.isError ? <div className="m-5 rounded-[10px] bg-[#FDEBEC] p-4 text-sm text-[#B9151B]">Data gagal dimuat. Pastikan API berjalan.</div> : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#F8FAFB] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-6 py-3.5">No. Rekaman</th><th className="px-5 py-3.5">Alat</th><th className="px-5 py-3.5">Perusahaan</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Diperbarui</th><th className="px-6 py-3.5 text-right">Aksi</th></tr></thead>
              <tbody className="divide-y divide-[#E3E8ED]">
                {query.data?.map((record) => <tr key={record.id} className="hover:bg-[#F8FAFB]"><td className="px-6 py-4 font-semibold text-[#183247]">{record.recordNumber}</td><td className="px-5 py-4"><span className="block font-medium">{record.instrumentForm.name}</span><span className="text-xs text-slate-400">{record.instrumentForm.code} · {record.instrumentForm.revision}</span></td><td className="px-5 py-4">{record.company.name}</td><td className="px-5 py-4"><Badge variant={statusVariant[record.status]}>{statusLabel[record.status]}</Badge></td><td className="px-5 py-4 text-slate-500">{formatIndonesianDate(record.updatedAt)}</td><td className="px-6 py-4"><div className="flex justify-end gap-1">{record.status === 'DRAFT' && <><Link href={`/calibrations/${record.id}/edit`} className="inline-flex size-9 items-center justify-center rounded-lg text-[#1F5F8B] hover:bg-[#EEF5FA]" aria-label="Edit"><Pencil className="size-4" /></Link><Button variant="ghost" className="size-9 px-0 text-[#B9151B] hover:bg-[#FDEBEC]" onClick={() => removeDraft(record)} disabled={remove.isPending} aria-label="Hapus"><Trash2 className="size-4" /></Button></>}</div></td></tr>)}
                {!query.isLoading && !query.data?.length && <tr><td colSpan={6} className="px-6 py-14 text-center text-slate-400">Belum ada rekaman yang sesuai.</td></tr>}
                {query.isLoading && <tr><td colSpan={6} className="px-6 py-14 text-center text-slate-400">Memuat data...</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
