'use client';

import type { CalibrationOptions, CalibrationRecordDetail, MeasurementTableDefinition } from '@certindo/types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@certindo/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { createCalibrationSchema, type CreateCalibrationInput } from '@certindo/validation';
import { apiRequest } from '@/lib/api';
import { sortInstrumentForms } from '@/lib/instrument-forms';

type InstrumentFormOption = CalibrationOptions['instrumentForms'][number];

function InstrumentFormPicker({
  disabled,
  onSelect,
  options,
  value,
}: {
  disabled: boolean;
  onSelect: (option: InstrumentFormOption) => void;
  options: InstrumentFormOption[];
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const listboxId = useId();
  const selected = options.find((option) => option.id === value);
  const sortedOptions = useMemo(() => sortInstrumentForms(options), [options]);
  const normalizedQuery = query.trim().toLocaleLowerCase('id');
  const filteredOptions = normalizedQuery
    ? sortedOptions.filter((option) => `${option.code} ${option.name}`.toLocaleLowerCase('id').includes(normalizedQuery))
    : sortedOptions;
  const selectedLabel = selected ? `${selected.code} · ${selected.name}` : '';

  return <div className="relative" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
  }}>
    <input
      aria-autocomplete="list"
      aria-controls={listboxId}
      aria-expanded={isOpen}
      autoComplete="off"
      className="h-11 w-full rounded-[10px] border border-[#DDE5EA] bg-white px-3.5 text-sm font-normal outline-none focus:border-[#1F5F8B] disabled:bg-slate-100"
      disabled={disabled}
      placeholder="Cari nomor FOM atau nama alat..."
      role="combobox"
      value={isOpen ? query : selectedLabel}
      onChange={(event) => { setQuery(event.target.value); setIsOpen(true); }}
      onFocus={() => { setQuery(''); setIsOpen(true); }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setIsOpen(false);
        if (event.key === 'Enter' && isOpen && filteredOptions[0]) {
          event.preventDefault();
          onSelect(filteredOptions[0]);
          setIsOpen(false);
        }
      }}
    />
    {isOpen && !disabled && <div id={listboxId} role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-[10px] border border-[#DDE5EA] bg-white py-1 shadow-lg">
      {filteredOptions.map((option) => <button
        key={option.id}
        type="button"
        role="option"
        aria-selected={option.id === value}
        className={`flex w-full items-start gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-[#EEF5FA] ${option.id === value ? 'bg-[#EEF5FA] text-[#1F5F8B]' : 'text-[#2D3A45]'}`}
        onClick={() => { onSelect(option); setIsOpen(false); }}
      >
        <span className="min-w-32 font-semibold">{option.code}</span>
        <span>{option.name}</span>
      </button>)}
      {!filteredOptions.length && <p className="px-3.5 py-4 text-sm text-slate-400">Template tidak ditemukan.</p>}
    </div>}
  </div>;
}

const today = new Date().toISOString().slice(0, 10);
const certificatePrefix = 'CTD/CAL/';
const createTorqueRows = (count: number) => Array.from(
  { length: count },
  () => ({ indication: '', readings: ['', '', '', '', ''] }),
);
const createDissolvedOxygenRows = () => Array.from(
  { length: 4 },
  (_, index) => ({ number: String(index + 1), standard: '', resolution: '', readings: ['', '', ''] }),
);
const normalizeTorqueRows = (
  rows: Array<{ indication?: string; readings?: string[] }> | undefined,
  count: number,
) => Array.from({ length: count }, (_, index) => ({
  indication: rows?.[index]?.indication ?? '',
  readings: Array.from({ length: 5 }, (__, readingIndex) => rows?.[index]?.readings?.[readingIndex] ?? ''),
}));
const normalizeDissolvedOxygenRows = (
  rows: Array<{ number?: string; standard?: string; resolution?: string; readings?: string[] }> | undefined,
) => Array.from({ length: 4 }, (_, index) => ({
  number: rows?.[index]?.number ?? String(index + 1),
  standard: rows?.[index]?.standard ?? '',
  resolution: rows?.[index]?.resolution ?? '',
  readings: Array.from({ length: 3 }, (__, readingIndex) => rows?.[index]?.readings?.[readingIndex] ?? ''),
}));
const normalizeMeasurementTables = (
  definitions: MeasurementTableDefinition[],
  existing: Record<string, Array<Record<string, string>>> | undefined,
) => Object.fromEntries(definitions.map((table) => [
  table.id,
  Array.from({ length: existing?.[table.id]?.length || 1 }, (_, rowIndex) => Object.fromEntries(table.columns.map((column) => [
    column.key,
    existing?.[table.id]?.[rowIndex]?.[column.key] ?? lockedColumnValue(column.lockedValues, rowIndex) ?? '',
  ]))),
]));

function lockedColumnValue(values: string[] | undefined, rowIndex: number): string | undefined {
  if (!values?.length) return undefined;
  if (values[rowIndex] !== undefined) return values[rowIndex];
  if (values.every((value) => /^\d+$/.test(value))) {
    const first = Number(values[0]);
    const groupSize = values.findIndex((value) => Number(value) !== first);
    if (groupSize > 0) return String(first + Math.floor(rowIndex / groupSize));
    return String(first + rowIndex);
  }
  return values[rowIndex % values.length];
}

function legacyMeasurementTables(
  measurements: CalibrationRecordDetail['formDataJson']['measurements'] | undefined,
): Record<string, Array<Record<string, string>>> {
  const legacy: Record<string, Array<Record<string, string>>> = {};
  if (measurements?.clockwise?.length) {
    legacy.clockwise = measurements.clockwise.map((row) => Object.fromEntries([
      ['indication', row.indication],
      ...row.readings.map((value, index) => [`reading${index + 1}`, value] as const),
    ]));
  }
  if (measurements?.counterClockwise?.length) {
    legacy.counterClockwise = measurements.counterClockwise.map((row) => Object.fromEntries([
      ['indication', row.indication],
      ...row.readings.map((value, index) => [`reading${index + 1}`, value] as const),
    ]));
  }
  if (measurements?.dissolvedOxygen?.length) {
    legacy.dissolvedOxygen = measurements.dissolvedOxygen.map((row) => ({
      number: row.number,
      standard: row.standard,
      resolution: row.resolution,
      ...Object.fromEntries(row.readings.map((value, index) => [`reading${index + 1}`, value])),
    }));
  }
  return { ...legacy, ...(measurements?.tables ?? {}) };
}
const defaults: CreateCalibrationInput = {
  companyId: '', instrumentFormId: '', certificateNumber: certificatePrefix,
  formData: {
    calibrationDate: today,
    calibrationLocation: '',
    instrument: { name: '', manufacturer: '', model: '', serialNumber: '', identityNumber: '', capacity: '', capacityMin: '', capacityMax: '', resolution: '' },
    environment: { temperatureStart: '', temperatureMiddle: '', temperatureEnd: '', humidityStart: '', humidityMiddle: '', humidityEnd: '' },
    measurements: { clockwise: createTorqueRows(10), counterClockwise: createTorqueRows(11), dissolvedOxygen: createDissolvedOxygenRows(), tables: {} },
    additionalFields: {},
    notes: '',
  },
};

export function CalibrationForm({ recordId }: { recordId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTemplateId = searchParams.get('templateId');

  const options = useQuery({ queryKey: ['calibration-options'], queryFn: () => apiRequest<CalibrationOptions>('/calibrations/options') });
  const record = useQuery({ queryKey: ['calibration', recordId], queryFn: () => apiRequest<CalibrationRecordDetail>(`/calibrations/${recordId}`), enabled: Boolean(recordId) });
  const form = useForm<CreateCalibrationInput>({ resolver: zodResolver(createCalibrationSchema), defaultValues: defaults });

  useEffect(() => {
    if (record.data) form.reset({
      companyId: record.data.company.id,
      instrumentFormId: record.data.instrumentForm.id,
      certificateNumber: record.data.certificateNumber?.startsWith(certificatePrefix) ? record.data.certificateNumber : `${certificatePrefix}${record.data.certificateNumber ?? ''}`,
      formData: {
        ...record.data.formDataJson,
        calibrationLocation: record.data.formDataJson.calibrationLocation ?? '',
        instrument: { ...record.data.formDataJson.instrument, identityNumber: record.data.formDataJson.instrument.identityNumber ?? '', capacityMin: record.data.formDataJson.instrument.capacityMin ?? '', capacityMax: record.data.formDataJson.instrument.capacityMax ?? '' },
        environment: { temperatureStart: record.data.formDataJson.environment?.temperatureStart ?? '', temperatureMiddle: record.data.formDataJson.environment?.temperatureMiddle ?? '', temperatureEnd: record.data.formDataJson.environment?.temperatureEnd ?? '', humidityStart: record.data.formDataJson.environment?.humidityStart ?? '', humidityMiddle: record.data.formDataJson.environment?.humidityMiddle ?? '', humidityEnd: record.data.formDataJson.environment?.humidityEnd ?? '' },
        measurements: {
          clockwise: normalizeTorqueRows(record.data.formDataJson.measurements?.clockwise, 10),
          counterClockwise: normalizeTorqueRows(record.data.formDataJson.measurements?.counterClockwise, 11),
          dissolvedOxygen: normalizeDissolvedOxygenRows(record.data.formDataJson.measurements?.dissolvedOxygen),
          tables: normalizeMeasurementTables(
            options.data?.instrumentForms.find((item) => item.id === record.data?.instrumentForm.id)?.measurementTables ?? [],
            legacyMeasurementTables(record.data.formDataJson.measurements),
          ),
        },
        additionalFields: record.data.formDataJson.additionalFields ?? {},
      },
    });
  }, [form, options.data, record.data]);

  useEffect(() => {
    if (!recordId && initialTemplateId && options.data?.instrumentForms) {
      const match = options.data.instrumentForms.find((item) => item.id === initialTemplateId);
      if (match && form.getValues('instrumentFormId') !== match.id) {
        form.setValue('instrumentFormId', match.id, { shouldValidate: true });
        applyInstrumentTemplate(match);
      }
    }
  }, [initialTemplateId, options.data, recordId]);

  const save = useMutation({
    mutationFn: (input: CreateCalibrationInput) => recordId
      ? apiRequest(`/calibrations/${recordId}`, { method: 'PATCH', body: JSON.stringify({ companyId: input.companyId, certificateNumber: input.certificateNumber, formData: input.formData }) })
      : apiRequest('/calibrations', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => router.push('/calibrations'),
  });
  const errors = form.formState.errors;
  const inputClass = 'space-y-2 text-sm font-semibold text-[#2D3A45]';
  const selectedInstrumentFormId = useWatch({ control: form.control, name: 'instrumentFormId' });
  const selectedTemplate = options.data?.instrumentForms.find((item) => item.id === selectedInstrumentFormId);
  const visibleFields = new Set(selectedTemplate?.fields ?? []);
  const watchedMeasurementTables = useWatch({ control: form.control, name: 'formData.measurements.tables' }) ?? {};
  const isReadOnly = Boolean(recordId && record.data?.status !== 'DRAFT');

  function applyInstrumentTemplate(selected: InstrumentFormOption): void {
    form.setValue('formData.instrument.name', selected.name, { shouldValidate: true, shouldDirty: true });
    if (!selected.fields.includes('identityNumber')) form.setValue('formData.instrument.identityNumber', '');
    if (!selected.fields.includes('capacity')) form.setValue('formData.instrument.capacity', '');
    if (!selected.fields.includes('capacityMin')) form.setValue('formData.instrument.capacityMin', '');
    if (!selected.fields.includes('capacityMax')) form.setValue('formData.instrument.capacityMax', '');
    if (!selected.fields.includes('resolution')) form.setValue('formData.instrument.resolution', '');
    if (!selected.fields.includes('ambientTemperatureStart')) form.setValue('formData.environment.temperatureStart', '');
    if (!selected.fields.includes('ambientTemperatureMiddle')) form.setValue('formData.environment.temperatureMiddle', '');
    if (!selected.fields.includes('ambientTemperatureEnd')) form.setValue('formData.environment.temperatureEnd', '');
    if (!selected.fields.includes('calibrationLocation')) form.setValue('formData.calibrationLocation', '');
    if (!selected.fields.includes('ambientHumidityStart')) form.setValue('formData.environment.humidityStart', '');
    if (!selected.fields.includes('ambientHumidityMiddle')) form.setValue('formData.environment.humidityMiddle', '');
    if (!selected.fields.includes('ambientHumidityEnd')) form.setValue('formData.environment.humidityEnd', '');
    form.setValue('formData.additionalFields', Object.fromEntries(selected.additionalFields.map((field) => [field.key, ''])));
    form.setValue('formData.measurements.tables', normalizeMeasurementTables(selected.measurementTables, undefined));
  }

  function addMeasurementRow(table: MeasurementTableDefinition): void {
    const rows = form.getValues(`formData.measurements.tables.${table.id}`) ?? [];
    const rowIndex = rows.length;
    const nextRow = Object.fromEntries(table.columns.map((column) => [
      column.key,
      lockedColumnValue(column.lockedValues, rowIndex) ?? '',
    ]));
    form.setValue(`formData.measurements.tables.${table.id}`, [...rows, nextRow], { shouldDirty: true });
  }

  function removeMeasurementRow(table: MeasurementTableDefinition, rowIndex: number): void {
    const rows = form.getValues(`formData.measurements.tables.${table.id}`) ?? [];
    if (rows.length <= 1) return;
    form.setValue(
      `formData.measurements.tables.${table.id}`,
      rows.filter((_, index) => index !== rowIndex),
      { shouldDirty: true },
    );
  }

  return (
    <form className="space-y-6" onSubmit={(event) => void form.handleSubmit((input) => save.mutate(input))(event)}>
      <div className="flex items-center justify-between gap-4"><Link href="/calibrations" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1F5F8B] hover:underline"><ArrowLeft className="size-4" /> Kembali</Link>{!isReadOnly && <Button type="submit" disabled={save.isPending || options.isLoading || record.isLoading}><Save className="size-4" /> {save.isPending ? 'Menyimpan...' : 'Simpan Draft'}</Button>}</div>
      {(options.isError || record.isError) && <div className="rounded-[10px] bg-[#FDEBEC] p-4 text-sm text-[#B9151B]">Data pendukung gagal dimuat. Pastikan API dan database berjalan.</div>}
      {save.isError && <div className="rounded-[10px] bg-[#FDEBEC] p-4 text-sm text-[#B9151B]">{save.error instanceof Error ? save.error.message : 'Draft gagal disimpan.'}</div>}
      {isReadOnly && record.data && <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><span className="font-semibold">Form hanya dapat dilihat.</span> {record.data.status === 'UNDER_REVIEW' ? 'Rekaman sedang dalam pemeriksaan.' : 'Rekaman yang telah dikonfirmasi atau diselesaikan tidak dapat diubah.'}{record.data.workflowNote && <span className="mt-1 block">Catatan workflow: {record.data.workflowNote}</span>}</div>}
      <fieldset className="space-y-6 disabled:opacity-75" disabled={isReadOnly}>
      <Card><CardHeader className="border-b"><CardTitle>Informasi Rekaman</CardTitle><p className="text-sm text-slate-400">Pilih perusahaan dan jenis formulir yang akan digunakan.</p></CardHeader><CardContent className="grid gap-5 pt-6 md:grid-cols-2">
        <label className={inputClass}>Perusahaan<select className="h-11 w-full rounded-[10px] border border-[#DDE5EA] bg-white px-3.5 text-sm font-normal outline-none focus:border-[#1F5F8B]" {...form.register('companyId')}><option value="">Pilih perusahaan</option>{options.data?.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>{errors.companyId && <span className="block text-xs font-normal text-[#D71920]">{errors.companyId.message}</span>}</label>
        <label className={inputClass}>Template instrumen<Controller control={form.control} name="instrumentFormId" render={({ field }) => <InstrumentFormPicker disabled={Boolean(recordId)} options={options.data?.instrumentForms ?? []} value={field.value} onSelect={(selected) => { field.onChange(selected.id); applyInstrumentTemplate(selected); }} />} />{errors.instrumentFormId && <span className="block text-xs font-normal text-[#D71920]">{errors.instrumentFormId.message}</span>}</label>
        <label className={inputClass}>Tanggal kalibrasi<Input type="date" {...form.register('formData.calibrationDate')} />{errors.formData?.calibrationDate && <span className="block text-xs font-normal text-[#D71920]">{errors.formData.calibrationDate.message}</span>}</label>
        {visibleFields.has('calibrationLocation') && <label className={inputClass}>Lokasi Kalibrasi<Input placeholder="Lokasi pelaksanaan kalibrasi" {...form.register('formData.calibrationLocation')} /></label>}
      </CardContent></Card>
      <Card><CardHeader className="border-b"><CardTitle>Identitas Alat</CardTitle><p className="text-sm text-slate-400">Field dasar ini disimpan netral dan nantinya dipetakan ke sheet Excel sesuai jenis alat.</p></CardHeader><CardContent className="grid gap-5 pt-6 md:grid-cols-2">
        {!selectedTemplate && <p className="text-sm font-normal text-slate-400 md:col-span-2">Pilih template instrumen untuk menampilkan field yang sesuai dengan lembar kerja.</p>}
        {visibleFields.has('certificateNumber') && <label className={inputClass}>1. No. Sertifikat<Controller control={form.control} name="certificateNumber" render={({ field }) => <div className="flex h-11 overflow-hidden rounded-[10px] border border-[#DDE5EA] bg-white focus-within:border-[#1F5F8B]"><span className="flex items-center border-r border-[#DDE5EA] bg-[#F8FAFB] px-3.5 text-sm font-semibold text-[#526575]">{certificatePrefix}</span><input className="min-w-0 flex-1 px-3.5 text-sm font-normal outline-none" placeholder="Nomor sertifikat" value={field.value.startsWith(certificatePrefix) ? field.value.slice(certificatePrefix.length) : field.value} onBlur={field.onBlur} onChange={(event) => field.onChange(`${certificatePrefix}${event.target.value.replace(/^CTD\/CAL\//i, '')}`)} ref={field.ref} /></div>} />{errors.certificateNumber && <span className="block text-xs font-normal text-[#D71920]">{errors.certificateNumber.message}</span>}</label>}
        {visibleFields.has('name') && <label className={inputClass}>2. Nama Alat<Input placeholder="Contoh: Digital Torque Gauge" {...form.register('formData.instrument.name')} />{errors.formData?.instrument?.name && <span className="block text-xs font-normal text-[#D71920]">{errors.formData.instrument.name.message}</span>}</label>}
        {visibleFields.has('manufacturer') && <label className={inputClass}>3. Merk<Input {...form.register('formData.instrument.manufacturer')} /></label>}
        {visibleFields.has('model') && <label className={inputClass}>4. Type/Model<Input {...form.register('formData.instrument.model')} /></label>}
        {visibleFields.has('serialNumber') && <label className={inputClass}>5. No. Seri<Input placeholder="Nomor seri alat" {...form.register('formData.instrument.serialNumber')} />{errors.formData?.instrument?.serialNumber && <span className="block text-xs font-normal text-[#D71920]">{errors.formData.instrument.serialNumber.message}</span>}</label>}
        {visibleFields.has('identityNumber') && <label className={inputClass}>6. No. Identitas<Input placeholder="Nomor identitas alat" {...form.register('formData.instrument.identityNumber')} /></label>}
        {visibleFields.has('capacity') && <label className={inputClass}>7. Kapasitas<Input placeholder="Contoh: 10 N·m" {...form.register('formData.instrument.capacity')} /></label>}
        {visibleFields.has('capacityMin') && <label className={inputClass}>7a. Kapasitas Min.<Input {...form.register('formData.instrument.capacityMin')} /></label>}
        {visibleFields.has('capacityMax') && <label className={inputClass}>7b. Kapasitas Max.<Input {...form.register('formData.instrument.capacityMax')} /></label>}
        {visibleFields.has('resolution') && <label className={inputClass}>8. Resolusi<Input placeholder="Contoh: 0,01 N·m" {...form.register('formData.instrument.resolution')} /></label>}
        {selectedTemplate?.additionalFields.map((field) => <label key={field.key} className={`${inputClass} ${field.inputType === 'textarea' ? 'md:col-span-2' : ''}`}>{field.label}{field.inputType === 'textarea' ? <textarea className="min-h-28 w-full rounded-[10px] border border-[#DDE5EA] bg-white px-3.5 py-3 text-sm font-normal outline-none focus:border-[#1F5F8B]" placeholder={field.placeholder} {...form.register(`formData.additionalFields.${field.key}`)} /> : <Input type={field.inputType === 'date' ? 'date' : 'text'} placeholder={field.placeholder} {...form.register(`formData.additionalFields.${field.key}`)} />}</label>)}
        {(visibleFields.has('ambientTemperatureStart') || visibleFields.has('ambientTemperatureMiddle') || visibleFields.has('ambientTemperatureEnd') || visibleFields.has('ambientHumidityStart') || visibleFields.has('ambientHumidityMiddle') || visibleFields.has('ambientHumidityEnd')) && <div className="border-t border-[#E7EDF1] pt-5 md:col-span-2"><h3 className="text-sm font-semibold text-[#2D3A45]">Kondisi Ruangan</h3><div className="mt-4 grid gap-5 md:grid-cols-3">{visibleFields.has('ambientTemperatureStart') && <label className={inputClass}>Temperatur Awal (°C)<Input inputMode="decimal" {...form.register('formData.environment.temperatureStart')} /></label>}{visibleFields.has('ambientTemperatureMiddle') && <label className={inputClass}>Temperatur Tengah (°C)<Input inputMode="decimal" {...form.register('formData.environment.temperatureMiddle')} /></label>}{visibleFields.has('ambientTemperatureEnd') && <label className={inputClass}>Temperatur Akhir (°C)<Input inputMode="decimal" {...form.register('formData.environment.temperatureEnd')} /></label>}{visibleFields.has('ambientHumidityStart') && <label className={inputClass}>Kelembaban Awal (%RH)<Input inputMode="decimal" {...form.register('formData.environment.humidityStart')} /></label>}{visibleFields.has('ambientHumidityMiddle') && <label className={inputClass}>Kelembaban Tengah (%RH)<Input inputMode="decimal" {...form.register('formData.environment.humidityMiddle')} /></label>}{visibleFields.has('ambientHumidityEnd') && <label className={inputClass}>Kelembaban Akhir (%RH)<Input inputMode="decimal" {...form.register('formData.environment.humidityEnd')} /></label>}</div></div>}
        <label className={`${inputClass} md:col-span-2`}>Catatan<textarea className="min-h-28 w-full rounded-[10px] border border-[#DDE5EA] bg-white px-3.5 py-3 text-sm font-normal outline-none focus:border-[#1F5F8B]" {...form.register('formData.notes')} /></label>
      </CardContent></Card>
      {selectedTemplate?.measurementTables.map((table) => {
        const rows = watchedMeasurementTables[table.id] ?? [];
        return <Card key={table.id}>
        <CardHeader className="flex-row items-center justify-between gap-4 border-b"><div><CardTitle>{table.title}</CardTitle><p className="mt-1 text-sm text-slate-400">Baris Excel akan mengikuti jumlah baris yang diisi di sini.</p></div><Button type="button" onClick={() => addMeasurementRow(table)}><Plus className="size-4" /> Tambah Baris</Button></CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto rounded-[10px] border border-[#DDE5EA]">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead className="bg-[#F8FAFB] text-[#526575]"><tr>{table.columns.map((column) => <th key={column.key} className="min-w-28 border-b border-r border-[#DDE5EA] px-3 py-3 text-left">{column.label}</th>)}<th className="w-20 border-b border-[#DDE5EA] px-3 py-3 text-center">Aksi</th></tr></thead>
              <tbody>{rows.map((_, rowIndex) => <tr key={rowIndex}>{table.columns.map((column) => {
                const lockedValue = lockedColumnValue(column.lockedValues, rowIndex);
                const fieldName = `formData.measurements.tables.${table.id}.${rowIndex}.${column.key}` as const;
                return <td key={column.key} className="border-b border-r border-[#DDE5EA] p-2 last:border-r-0">
                  {lockedValue !== undefined
                    ? <><span className="block min-h-10 px-2 py-2.5 text-center text-slate-600">{lockedValue}</span><input type="hidden" value={lockedValue} {...form.register(fieldName)} /></>
                    : <Input inputMode="decimal" aria-label={`${table.title} ${column.label} baris ${rowIndex + 1}`} {...form.register(fieldName)} />}
                </td>;
              })}<td className="border-b border-[#DDE5EA] p-2 text-center"><button type="button" aria-label={`Hapus baris ${rowIndex + 1}`} disabled={rows.length <= 1} className="inline-flex size-9 items-center justify-center rounded-lg text-[#D71920] hover:bg-[#FDEBEC] disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent" onClick={() => removeMeasurementRow(table, rowIndex)}><Trash2 className="size-4" /></button></td></tr>)}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>;
      })}
      </fieldset>
    </form>
  );
}
