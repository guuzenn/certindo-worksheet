'use client';

import type { InstrumentFormDetailItem, InstrumentFormSummaryItem } from '@certindo/types';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@certindo/ui';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Filter,
  Gauge,
  Layers,
  Search,
  Table,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';

export function InstrumentFormsView() {
  const [search, setSearch] = useState('');
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  const queryParams = new URLSearchParams({
    ...(search ? { search } : {}),
    ...(needsReviewOnly ? { needsReview: 'true' } : {}),
  }).toString();

  const catalogQuery = useQuery({
    queryKey: ['instrument-forms', search, needsReviewOnly],
    queryFn: () =>
      apiRequest<InstrumentFormSummaryItem[]>(
        `/instrument-forms${queryParams ? `?${queryParams}` : ''}`,
      ),
  });

  const detailQuery = useQuery({
    queryKey: ['instrument-form-detail', selectedFormId],
    queryFn: () => apiRequest<InstrumentFormDetailItem>(`/instrument-forms/${selectedFormId}`),
    enabled: Boolean(selectedFormId),
  });

  const forms = catalogQuery.data ?? [];

  const stats = useMemo(() => {
    const total = forms.length;
    const reviewNeeded = forms.filter((f) => f.needsTemplateReview).length;
    const ready = total - reviewNeeded;
    const earlyCount = forms.filter((f) => f.workbook.includes('0X-94')).length;
    const currentCount = forms.filter((f) => f.workbook.includes('095-163')).length;
    return { total, ready, reviewNeeded, earlyCount, currentCount };
  }, [forms]);

  const selectedForm = detailQuery.data;

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <section className="flex flex-col justify-between gap-5 rounded-xl border bg-white p-6 shadow-[0_5px_18px_rgba(24,50,71,0.06)] sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[#D71920]">Katalog Template Instrumen</p>
          <h2 className="mt-1 font-heading text-2xl font-extrabold text-[#183247]">
            Master Lembar Kerja Kalibrasi Certindo
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Jelajahi 89+ jenis instrumen kalibrasi, petakan identitas alat dan tabel pengukuran dinamis ke workbook Excel master.
          </p>
        </div>
        <Link
          href="/calibrations/new"
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#D71920] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#B9151B]"
        >
          <Gauge className="size-4" /> Buat Kalibrasi Baru
        </Link>
      </section>

      {/* Summary Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Template</p>
              <p className="mt-2 font-heading text-3xl font-extrabold text-[#183247]">
                {catalogQuery.isLoading ? '—' : stats.total}
              </p>
              <p className="mt-1 text-xs text-slate-400">Master workbook 0X–163</p>
            </div>
            <span className="grid size-10 place-items-center rounded-[10px] bg-[#EEF5FA] text-[#1F5F8B]">
              <Layers className="size-5" />
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Siap Ekspor</p>
              <p className="mt-2 font-heading text-3xl font-extrabold text-[#183247]">
                {catalogQuery.isLoading ? '—' : stats.ready}
              </p>
              <p className="mt-1 text-xs text-slate-400">Mapping final & terverifikasi</p>
            </div>
            <span className="grid size-10 place-items-center rounded-[10px] bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="size-5" />
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Peninjauan Template</p>
              <p className="mt-2 font-heading text-3xl font-extrabold text-[#183247]">
                {catalogQuery.isLoading ? '—' : stats.reviewNeeded}
              </p>
              <p className="mt-1 text-xs text-slate-400">Perlu tinjauan metadata</p>
            </div>
            <span className="grid size-10 place-items-center rounded-[10px] bg-amber-50 text-amber-700">
              <AlertTriangle className="size-5" />
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Workbook Master</p>
              <p className="mt-2 font-heading text-xl font-extrabold text-[#183247]">
                {stats.earlyCount} / {stats.currentCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">0X–94 / 095–163.xlsx</p>
            </div>
            <span className="grid size-10 place-items-center rounded-[10px] bg-indigo-50 text-indigo-700">
              <FileSpreadsheet className="size-5" />
            </span>
          </CardContent>
        </Card>
      </section>

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
              <input
                className="h-11 w-full rounded-[10px] border border-[#DDE5EA] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#1F5F8B]"
                placeholder="Cari kode FOM atau nama alat (misal: Pressure, FOM-010, Caliper)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <button
              type="button"
              onClick={() => setNeedsReviewOnly(!needsReviewOnly)}
              className={`inline-flex h-11 items-center gap-2 rounded-[10px] border px-4 text-sm font-semibold transition-colors ${
                needsReviewOnly
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-[#DDE5EA] bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="size-4" />
              <span>Hanya Perlu Review</span>
              {needsReviewOnly && (
                <span className="grid size-5 place-items-center rounded-full bg-amber-200 text-xs font-bold">
                  ✓
                </span>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Template Catalog Grid */}
      {catalogQuery.isError && (
        <div className="rounded-[10px] border border-red-100 bg-[#FDEBEC] p-4 text-sm text-[#B9151B]">
          Gagal memuat katalog template. Pastikan server API dan database berjalan.
        </div>
      )}

      {!catalogQuery.isError && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {catalogQuery.isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="space-y-3 p-5">
                  <div className="h-4 w-28 rounded bg-slate-200" />
                  <div className="h-6 w-3/4 rounded bg-slate-200" />
                  <div className="h-4 w-1/2 rounded bg-slate-200" />
                </CardContent>
              </Card>
            ))}

          {!catalogQuery.isLoading &&
            forms.map((form) => (
              <Card
                key={form.id}
                className="flex flex-col justify-between transition-all hover:border-[#1F5F8B]/40 hover:shadow-md"
              >
                <CardHeader className="space-y-2.5 p-5 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-block rounded-md bg-[#EEF5FA] px-2.5 py-1 text-xs font-bold text-[#1F5F8B]">
                      {form.code}{form.revision !== 'DRAFT-1' ? ` · Rev. ${form.revision}` : ''}
                    </span>
                    {form.needsTemplateReview ? (
                      <Badge variant="warning">Tinjau Template</Badge>
                    ) : (
                      <Badge variant="success">Siap Ekspor</Badge>
                    )}
                  </div>
                  <CardTitle className="line-clamp-1 font-heading text-lg font-bold text-[#183247]">
                    {form.name}
                  </CardTitle>
                  <p className="line-clamp-2 text-xs leading-5 text-slate-500">
                    {form.description ?? 'Template lembar kerja kalibrasi Certindo'}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4 p-5 pt-0">
                  <div className="space-y-1.5 rounded-lg bg-[#F8FAFB] p-3 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Sheet Excel:</span>
                      <span className="font-semibold text-[#2D3A45]">{form.sheet}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Workbook:</span>
                      <span className="truncate font-medium text-slate-500" title={form.workbook}>
                        {form.workbook.split('/').pop()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-[#E3E8ED]">
                      <span className="flex items-center gap-1 text-slate-500">
                        <FileText className="size-3.5" /> {form.fieldsCount} Field Identitas
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Table className="size-3.5" /> {form.tablesCount} Tabel Pengukuran
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => setSelectedFormId(form.id)}
                    >
                      Lihat Detail
                    </Button>
                    <Link
                      href={`/calibrations/new?templateId=${form.id}`}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-[#183247] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#123B5D]"
                    >
                      Gunakan <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}

          {!catalogQuery.isLoading && !forms.length && (
            <div className="col-span-full py-16 text-center text-slate-400">
              Tidak ada template instrumen yang sesuai dengan pencarian.
            </div>
          )}
        </div>
      )}

      {/* Modal Detail Template */}
      {selectedFormId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
              <div>
                <span className="text-xs font-bold text-[#1F5F8B]">
                  {selectedForm?.code ?? '...' }
                </span>
                <h3 className="font-heading text-xl font-extrabold text-[#183247]">
                  {selectedForm?.name ?? 'Memuat...'}
                </h3>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                onClick={() => setSelectedFormId(null)}
              >
                <X className="size-5" />
              </button>
            </div>

            {detailQuery.isLoading && (
              <div className="p-12 text-center text-sm text-slate-400">Memuat detail template...</div>
            )}

            {selectedForm && (
              <div className="space-y-6 p-6">
                {/* Status & Excel File info */}
                <div className="grid gap-3 sm:grid-cols-2 rounded-lg bg-[#F8FAFB] p-4 text-xs">
                  <div>
                    <span className="block text-slate-400">Master Sheet</span>
                    <span className="font-semibold text-[#183247]">{selectedForm.mappingJson.sheet}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Master Workbook</span>
                    <span className="font-medium text-slate-600">{selectedForm.mappingJson.workbook}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Revisi Template</span>
                    <span className="font-semibold text-slate-600">{selectedForm.revision}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Status Peninjauan</span>
                    {selectedForm.mappingJson.needsTemplateReview ? (
                      <span className="font-semibold text-amber-700">Perlu Peninjauan Metadata</span>
                    ) : (
                      <span className="font-semibold text-emerald-700">Siap Ekspor Workbook</span>
                    )}
                  </div>
                </div>

                {/* Identitas Field List */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 font-heading text-sm font-bold text-[#183247]">
                    <FileText className="size-4 text-[#1F5F8B]" /> Field Identitas Alat ({selectedForm.schemaJson.fields.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedForm.schemaJson.fields.map((field) => (
                      <span key={field} className="rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Additional Fields */}
                {selectedForm.schemaJson.additionalFields.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-heading text-sm font-bold text-[#183247]">
                      Field Tambahan ({selectedForm.schemaJson.additionalFields.length})
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectedForm.schemaJson.additionalFields.map((f) => (
                        <div key={f.key} className="rounded-md border bg-slate-50 p-2 text-xs">
                          <span className="font-semibold text-[#2D3A45]">{f.label}</span>
                          <span className="block text-[11px] text-slate-400">Key: {f.key}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Measurement Tables List */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 font-heading text-sm font-bold text-[#183247]">
                    <Table className="size-4 text-[#1F5F8B]" /> Tabel Pengukuran ({selectedForm.schemaJson.measurementTables.length})
                  </h4>
                  {selectedForm.schemaJson.measurementTables.map((table) => (
                    <div key={table.id} className="rounded-lg border bg-white p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#183247]">{table.title}</span>
                        <span className="text-[11px] text-slate-400">ID: {table.id}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {table.columns.map((col) => (
                          <span key={col.key} className="rounded bg-[#EEF5FA] px-2 py-0.5 text-[11px] font-semibold text-[#1F5F8B]">
                            {col.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!selectedForm.schemaJson.measurementTables.length && (
                    <p className="text-xs text-slate-400">Belum ada tabel pengukuran khusus untuk template ini.</p>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedFormId(null)}>
                    Tutup
                  </Button>
                  <Link
                    href={`/calibrations/new?templateId=${selectedForm.id}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#D71920] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#B9151B]"
                  >
                    Gunakan Template Ini <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
