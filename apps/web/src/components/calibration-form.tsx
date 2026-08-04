'use client';

import type { CalibrationOptions, CalibrationRecordDetail } from '@certindo/types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@certindo/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { createCalibrationSchema, type CreateCalibrationInput } from '@certindo/validation';
import { apiRequest } from '@/lib/api';

const today = new Date().toISOString().slice(0, 10);
const defaults: CreateCalibrationInput = {
  companyId: '', instrumentFormId: '',
  formData: { calibrationDate: today, instrument: { name: '', manufacturer: '', model: '', serialNumber: '', capacity: '', resolution: '' }, notes: '' },
};

export function CalibrationForm({ recordId }: { recordId?: string }) {
  const router = useRouter();
  const options = useQuery({ queryKey: ['calibration-options'], queryFn: () => apiRequest<CalibrationOptions>('/calibrations/options') });
  const record = useQuery({ queryKey: ['calibration', recordId], queryFn: () => apiRequest<CalibrationRecordDetail>(`/calibrations/${recordId}`), enabled: Boolean(recordId) });
  const form = useForm<CreateCalibrationInput>({ resolver: zodResolver(createCalibrationSchema), defaultValues: defaults });

  useEffect(() => {
    if (record.data) form.reset({ companyId: record.data.company.id, instrumentFormId: record.data.instrumentForm.id, formData: record.data.formDataJson });
  }, [form, record.data]);

  const save = useMutation({
    mutationFn: (input: CreateCalibrationInput) => recordId
      ? apiRequest(`/calibrations/${recordId}`, { method: 'PATCH', body: JSON.stringify({ companyId: input.companyId, formData: input.formData }) })
      : apiRequest('/calibrations', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => router.push('/calibrations'),
  });
  const errors = form.formState.errors;
  const inputClass = 'space-y-2 text-sm font-semibold text-[#2D3A45]';

  return (
    <form className="space-y-6" onSubmit={(event) => void form.handleSubmit((input) => save.mutate(input))(event)}>
      <div className="flex items-center justify-between gap-4"><Link href="/calibrations" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1F5F8B] hover:underline"><ArrowLeft className="size-4" /> Kembali</Link><Button type="submit" disabled={save.isPending || options.isLoading || record.isLoading}><Save className="size-4" /> {save.isPending ? 'Menyimpan...' : 'Simpan Draft'}</Button></div>
      {(options.isError || record.isError) && <div className="rounded-[10px] bg-[#FDEBEC] p-4 text-sm text-[#B9151B]">Data pendukung gagal dimuat. Pastikan API dan database berjalan.</div>}
      {save.isError && <div className="rounded-[10px] bg-[#FDEBEC] p-4 text-sm text-[#B9151B]">{save.error instanceof Error ? save.error.message : 'Draft gagal disimpan.'}</div>}
      <Card><CardHeader className="border-b"><CardTitle>Informasi Rekaman</CardTitle><p className="text-sm text-slate-400">Pilih perusahaan dan jenis formulir yang akan digunakan.</p></CardHeader><CardContent className="grid gap-5 pt-6 md:grid-cols-2">
        <label className={inputClass}>Perusahaan<select className="h-11 w-full rounded-[10px] border border-[#DDE5EA] bg-white px-3.5 text-sm font-normal outline-none focus:border-[#1F5F8B]" {...form.register('companyId')}><option value="">Pilih perusahaan</option>{options.data?.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>{errors.companyId && <span className="block text-xs font-normal text-[#D71920]">{errors.companyId.message}</span>}</label>
        <label className={inputClass}>Template instrumen<select disabled={Boolean(recordId)} className="h-11 w-full rounded-[10px] border border-[#DDE5EA] bg-white px-3.5 text-sm font-normal outline-none disabled:bg-slate-100" {...form.register('instrumentFormId')}><option value="">Pilih instrumen</option>{options.data?.instrumentForms.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.revision}</option>)}</select>{errors.instrumentFormId && <span className="block text-xs font-normal text-[#D71920]">{errors.instrumentFormId.message}</span>}</label>
        <label className={inputClass}>Tanggal kalibrasi<Input type="date" {...form.register('formData.calibrationDate')} />{errors.formData?.calibrationDate && <span className="block text-xs font-normal text-[#D71920]">{errors.formData.calibrationDate.message}</span>}</label>
      </CardContent></Card>
      <Card><CardHeader className="border-b"><CardTitle>Identitas Alat</CardTitle><p className="text-sm text-slate-400">Field dasar ini disimpan netral dan nantinya dipetakan ke sheet Excel sesuai jenis alat.</p></CardHeader><CardContent className="grid gap-5 pt-6 md:grid-cols-2">
        <label className={inputClass}>Nama alat<Input placeholder="Contoh: Digital Torque Gauge" {...form.register('formData.instrument.name')} />{errors.formData?.instrument?.name && <span className="block text-xs font-normal text-[#D71920]">{errors.formData.instrument.name.message}</span>}</label>
        <label className={inputClass}>Nomor seri<Input placeholder="Nomor seri alat" {...form.register('formData.instrument.serialNumber')} />{errors.formData?.instrument?.serialNumber && <span className="block text-xs font-normal text-[#D71920]">{errors.formData.instrument.serialNumber.message}</span>}</label>
        <label className={inputClass}>Pabrikan<Input {...form.register('formData.instrument.manufacturer')} /></label><label className={inputClass}>Model / tipe<Input {...form.register('formData.instrument.model')} /></label><label className={inputClass}>Kapasitas<Input placeholder="Contoh: 10 N·m" {...form.register('formData.instrument.capacity')} /></label><label className={inputClass}>Resolusi<Input placeholder="Contoh: 0,01 N·m" {...form.register('formData.instrument.resolution')} /></label>
        <label className={`${inputClass} md:col-span-2`}>Catatan<textarea className="min-h-28 w-full rounded-[10px] border border-[#DDE5EA] bg-white px-3.5 py-3 text-sm font-normal outline-none focus:border-[#1F5F8B]" {...form.register('formData.notes')} /></label>
      </CardContent></Card>
    </form>
  );
}
