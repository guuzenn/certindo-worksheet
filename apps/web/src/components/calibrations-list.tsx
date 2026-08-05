'use client';

import type { AuthUser, CalibrationRecordSummary, CalibrationStatus } from '@certindo/types';
import { Badge, Button, Card, CardContent } from '@certindo/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, FilePlus2, FileSpreadsheet, Pencil, RotateCcw, Search, Send, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDeleteModal } from '@/components/confirm-delete-modal';
import { apiDownload, apiRequest } from '@/lib/api';
import { formatIndonesianDate } from '@/lib/format';

const statusLabel: Record<CalibrationStatus, string> = {
  DRAFT: 'Draft',
  UNDER_REVIEW: 'Dalam Pemeriksaan',
  CONFIRMED: 'Terkonfirmasi',
  POSTPONED: 'Ditunda',
  COMPLETED: 'Selesai',
};
const statusVariant = { DRAFT: 'neutral', UNDER_REVIEW: 'warning', CONFIRMED: 'purple', POSTPONED: 'danger', COMPLETED: 'success' } as const;

interface TransitionVariables {
  record: CalibrationRecordSummary;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'CONFIRMED' | 'COMPLETED';
  note?: string;
}

export function CalibrationsList() {
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [deletingRecord, setDeletingRecord] = useState<CalibrationRecordSummary | null>(null);
  const [revisionRecord, setRevisionRecord] = useState<CalibrationRecordSummary | null>(null);
  const [revisionNote, setRevisionNote] = useState('');

  const user = useQuery({ queryKey: ['auth-user'], queryFn: () => apiRequest<AuthUser>('/auth/me') });
  const queryString = new URLSearchParams({ ...(search ? { search } : {}), ...(status ? { status } : {}) }).toString();
  const query = useQuery({
    queryKey: ['calibrations', search, status],
    queryFn: () => apiRequest<CalibrationRecordSummary[]>(`/calibrations${queryString ? `?${queryString}` : ''}`),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiRequest<{ id: string }>(`/calibrations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['calibrations'] });
      setDeletingRecord(null);
    },
  });
  const generate = useMutation({
    mutationFn: (record: CalibrationRecordSummary) => apiRequest<{ fileName: string }>(`/calibrations/${record.id}/generate`, { method: 'POST' }),
    onSuccess: async (result, record) => {
      await apiDownload(`/calibrations/${record.id}/download`, result.fileName);
      await client.invalidateQueries({ queryKey: ['calibrations'] });
    },
  });
  const transition = useMutation({
    mutationFn: ({ record, status: targetStatus, note }: TransitionVariables) => apiRequest<CalibrationRecordSummary>(
      `/calibrations/${record.id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status: targetStatus, ...(note ? { note } : {}) }) },
    ),
    onSuccess: async () => {
      setRevisionRecord(null);
      setRevisionNote('');
      await client.invalidateQueries({ queryKey: ['calibrations'] });
    },
  });

  const role = user.data?.role;
  const canManageDrafts = role === 'ADMIN' || role === 'TECHNICIAN';
  const canReview = role === 'ADMIN' || role === 'REVIEWER' || role === 'APPROVER';
  const canComplete = role === 'ADMIN' || role === 'APPROVER';
  const actionError = transition.error ?? generate.error ?? remove.error;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <p className="max-w-2xl text-sm leading-6 text-slate-500">Kelola seluruh rekaman kalibrasi dari draft sampai dokumen selesai.</p>
        {canManageDrafts && <Link href="/calibrations/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#D71920] px-5 text-sm font-semibold text-white hover:bg-[#B9151B]"><FilePlus2 className="size-4" /> Kalibrasi Baru</Link>}
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
          {(query.isError || user.isError || actionError) && <div className="m-5 rounded-[10px] bg-[#FDEBEC] p-4 text-sm text-[#B9151B]">{actionError instanceof Error ? actionError.message : 'Data gagal dimuat. Pastikan API berjalan.'}</div>}
          {!query.isError && (
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-[#F8FAFB] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-6 py-3.5">No. Rekaman</th><th className="px-5 py-3.5">Alat</th><th className="px-5 py-3.5">Perusahaan</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Diperbarui</th><th className="px-6 py-3.5 text-right">Aksi</th></tr></thead>
              <tbody className="divide-y divide-[#E3E8ED]">
                {query.data?.map((record) => {
                  const busy = transition.isPending || generate.isPending || remove.isPending;
                  return <tr key={record.id} className="hover:bg-[#F8FAFB]">
                    <td className="px-6 py-4 font-semibold text-[#183247]">{record.recordNumber}{record.workflowNote && <span className="mt-1 block max-w-52 truncate text-xs font-normal text-[#B45309]" title={record.workflowNote}>Catatan: {record.workflowNote}</span>}</td>
                    <td className="px-5 py-4"><span className="block font-medium">{record.instrumentForm.name}</span><span className="text-xs text-slate-400">{record.instrumentForm.code} · {record.instrumentForm.revision}</span></td>
                    <td className="px-5 py-4">{record.company.name}</td>
                    <td className="px-5 py-4"><Badge variant={statusVariant[record.status]}>{statusLabel[record.status]}</Badge></td>
                    <td className="px-5 py-4 text-slate-500">{formatIndonesianDate(record.updatedAt)}</td>
                    <td className="px-6 py-4"><div className="flex justify-end gap-1">
                      {canManageDrafts && <Button variant="ghost" className="size-9 px-0 text-emerald-700 hover:bg-emerald-50" onClick={() => generate.mutate(record)} disabled={busy} aria-label="Buat dan unduh Excel"><FileSpreadsheet className="size-4" /></Button>}
                      {record.status === 'DRAFT' && canManageDrafts && <>
                        <Link href={`/calibrations/${record.id}/edit`} className="inline-flex size-9 items-center justify-center rounded-lg text-[#1F5F8B] hover:bg-[#EEF5FA]" aria-label="Edit"><Pencil className="size-4" /></Link>
                        <Button variant="ghost" className="size-9 px-0 text-[#1F5F8B] hover:bg-[#EEF5FA]" onClick={() => transition.mutate({ record, status: 'UNDER_REVIEW' })} disabled={busy} aria-label="Ajukan peninjauan" title="Ajukan peninjauan"><Send className="size-4" /></Button>
                        <Button variant="ghost" className="size-9 px-0 text-[#B9151B] hover:bg-[#FDEBEC]" onClick={() => setDeletingRecord(record)} disabled={busy} aria-label="Hapus"><Trash2 className="size-4" /></Button>
                      </>}
                      {record.status !== 'DRAFT' && <Link href={`/calibrations/${record.id}/edit`} className="inline-flex size-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Lihat detail" title="Lihat detail"><Eye className="size-4" /></Link>}
                      {record.status === 'UNDER_REVIEW' && canReview && <>
                        <Button variant="ghost" className="size-9 px-0 text-[#1F5F8B] hover:bg-[#EEF5FA]" onClick={() => transition.mutate({ record, status: 'CONFIRMED' })} disabled={busy} aria-label="Setujui" title="Setujui"><CheckCircle2 className="size-4" /></Button>
                        {canComplete && <Button variant="ghost" className="size-9 px-0 text-emerald-700 hover:bg-emerald-50" onClick={() => transition.mutate({ record, status: 'COMPLETED' })} disabled={busy} aria-label="Setujui dan selesaikan" title="Setujui dan selesaikan"><CheckCircle2 className="size-4" /></Button>}
                        <Button variant="ghost" className="size-9 px-0 text-[#B45309] hover:bg-amber-50" onClick={() => { transition.reset(); setRevisionRecord(record); setRevisionNote(''); }} disabled={busy} aria-label="Minta perbaikan" title="Minta perbaikan"><RotateCcw className="size-4" /></Button>
                      </>}
                      {record.status === 'CONFIRMED' && canComplete && <Button variant="ghost" className="size-9 px-0 text-emerald-700 hover:bg-emerald-50" onClick={() => transition.mutate({ record, status: 'COMPLETED' })} disabled={busy} aria-label="Selesaikan" title="Selesaikan"><CheckCircle2 className="size-4" /></Button>}
                    </div></td>
                  </tr>;
                })}
                {!query.isLoading && !query.data?.length && <tr><td colSpan={6} className="px-6 py-14 text-center text-slate-400">Belum ada rekaman yang sesuai.</td></tr>}
                {query.isLoading && <tr><td colSpan={6} className="px-6 py-14 text-center text-slate-400">Memuat data...</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteModal
        isOpen={Boolean(deletingRecord)}
        title="Hapus Draft Kalibrasi"
        description={`Apakah Anda yakin ingin menghapus draft lembar kerja kalibrasi ${deletingRecord?.recordNumber ?? ''}? Data yang dihapus tidak dapat dikembalikan.`}
        isLoading={remove.isPending}
        onConfirm={() => deletingRecord && remove.mutate(deletingRecord.id)}
        onClose={() => setDeletingRecord(null)}
      />

      {revisionRecord && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="revision-title">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4"><div><h2 id="revision-title" className="font-heading text-xl font-bold text-[#183247]">Minta Perbaikan</h2><p className="mt-1 text-sm text-slate-500">{revisionRecord.recordNumber} akan dikembalikan menjadi draft.</p></div><button type="button" aria-label="Tutup" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" onClick={() => setRevisionRecord(null)}><X className="size-5" /></button></div>
          <label className="mt-5 block space-y-2 text-sm font-semibold text-[#2D3A45]">Catatan perbaikan<textarea autoFocus maxLength={1000} className="min-h-32 w-full rounded-[10px] border border-[#DDE5EA] px-3.5 py-3 text-sm font-normal outline-none focus:border-[#1F5F8B]" placeholder="Jelaskan bagian yang perlu diperbaiki..." value={revisionNote} onChange={(event) => setRevisionNote(event.target.value)} /></label>
          {transition.isError && <p className="mt-3 text-sm text-[#B9151B]">{transition.error instanceof Error ? transition.error.message : 'Status gagal diperbarui.'}</p>}
          <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setRevisionRecord(null)} disabled={transition.isPending}>Batal</Button><Button type="button" disabled={!revisionNote.trim() || transition.isPending} onClick={() => transition.mutate({ record: revisionRecord, status: 'DRAFT', note: revisionNote })}><RotateCcw className="size-4" />{transition.isPending ? 'Mengirim...' : 'Kirim Permintaan'}</Button></div>
        </div>
      </div>}
    </div>
  );
}
