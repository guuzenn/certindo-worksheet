'use client';

import type { CompanyDetailItem, CompanyItem } from '@certindo/types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@certindo/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Edit2,
  FileSpreadsheet,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { companySchema, type CreateCompanyInput } from '@certindo/validation';
import { ConfirmDeleteModal } from '@/components/confirm-delete-modal';
import { apiRequest } from '@/lib/api';

export function CompaniesView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<CompanyItem | null>(null);

  const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';

  const companiesQuery = useQuery({
    queryKey: ['companies', search],
    queryFn: () => apiRequest<CompanyItem[]>(`/companies${queryParams}`),
  });

  const detailQuery = useQuery({
    queryKey: ['company-detail', selectedCompanyId],
    queryFn: () => apiRequest<CompanyDetailItem>(`/companies/${selectedCompanyId}`),
    enabled: Boolean(selectedCompanyId),
  });

  const form = useForm<CreateCompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: { name: '', address: '', phone: '', email: '' },
  });

  const saveMutation = useMutation({
    mutationFn: (input: CreateCompanyInput) =>
      editingCompany
        ? apiRequest(`/companies/${editingCompany.id}`, { method: 'PATCH', body: JSON.stringify(input) })
        : apiRequest('/companies', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsFormOpen(false);
      setEditingCompany(null);
      form.reset({ name: '', address: '', phone: '', email: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/companies/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDeletingCompany(null);
    },
  });

  function handleOpenCreate() {
    setEditingCompany(null);
    form.reset({ name: '', address: '', phone: '', email: '' });
    setIsFormOpen(true);
  }

  function handleOpenEdit(company: CompanyItem) {
    setEditingCompany(company);
    form.reset({
      name: company.name,
      address: company.address ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
    });
    setIsFormOpen(true);
  }

  const companies = companiesQuery.data ?? [];
  const totalRecords = companies.reduce((acc, c) => acc + c.recordsCount, 0);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="flex flex-col justify-between gap-5 rounded-xl border bg-white p-6 shadow-[0_5px_18px_rgba(24,50,71,0.06)] sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[#D71920]">Manajemen Klien</p>
          <h2 className="mt-1 font-heading text-2xl font-extrabold text-[#183247]">
            Daftar Perusahaan Klien
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Kelola data perusahaan klien kalibrasi, kontak, alamat, dan pantau riwayat lembar kerja kalibrasi yang telah diterbitkan.
          </p>
        </div>
        <Button
          type="button"
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#D71920] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#B9151B]"
          onClick={handleOpenCreate}
        >
          <Plus className="size-4" /> Tambah Perusahaan
        </Button>
      </section>

      {/* Summary Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Perusahaan Klien</p>
              <p className="mt-2 font-heading text-3xl font-extrabold text-[#183247]">
                {companiesQuery.isLoading ? '—' : companies.length}
              </p>
              <p className="mt-1 text-xs text-slate-400">Terdaftar di sistem Certindo</p>
            </div>
            <span className="grid size-10 place-items-center rounded-[10px] bg-[#EEF5FA] text-[#1F5F8B]">
              <Building2 className="size-5" />
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Lembar Kerja</p>
              <p className="mt-2 font-heading text-3xl font-extrabold text-[#183247]">
                {companiesQuery.isLoading ? '—' : totalRecords}
              </p>
              <p className="mt-1 text-xs text-slate-400">Diterbitkan untuk seluruh klien</p>
            </div>
            <span className="grid size-10 place-items-center rounded-[10px] bg-emerald-50 text-emerald-700">
              <FileSpreadsheet className="size-5" />
            </span>
          </CardContent>
        </Card>
      </section>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-5">
          <label className="relative flex-1 block">
            <Search className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
            <input
              className="h-11 w-full rounded-[10px] border border-[#DDE5EA] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#1F5F8B]"
              placeholder="Cari perusahaan berdasarkan nama, alamat, telepon, atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </CardContent>
      </Card>

      {/* Companies List Grid */}
      {companiesQuery.isError && (
        <div className="rounded-[10px] border border-red-100 bg-[#FDEBEC] p-4 text-sm text-[#B9151B]">
          Gagal memuat daftar perusahaan. Pastikan server API dan database terhubung.
        </div>
      )}

      {!companiesQuery.isError && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {companiesQuery.isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="space-y-3 p-5">
                  <div className="h-6 w-3/4 rounded bg-slate-200" />
                  <div className="h-4 w-1/2 rounded bg-slate-200" />
                </CardContent>
              </Card>
            ))}

          {!companiesQuery.isLoading &&
            companies.map((company) => (
              <Card
                key={company.id}
                className="flex flex-col justify-between transition-all hover:border-[#1F5F8B]/40 hover:shadow-md"
              >
                <CardHeader className="space-y-2 p-5 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1F5F8B]">
                      <Building2 className="size-3.5" /> KLIEN
                    </span>
                    <span className="rounded-md bg-[#EEF5FA] px-2 py-0.5 text-xs font-bold text-[#183247]">
                      {company.recordsCount} Kalibrasi
                    </span>
                  </div>
                  <CardTitle className="line-clamp-1 font-heading text-lg font-bold text-[#183247]">
                    {company.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 p-5 pt-0">
                  <div className="space-y-2 text-xs text-slate-500">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                      <span className="line-clamp-2">{company.address || 'Alamat belum diisi'}</span>
                    </div>
                    {company.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 text-slate-400" />
                        <span>{company.phone}</span>
                      </div>
                    )}
                    {company.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="size-3.5 text-slate-400" />
                        <span className="truncate">{company.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#E3E8ED]">
                    <Button
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => setSelectedCompanyId(company.id)}
                    >
                      Riwayat ({company.recordsCount})
                    </Button>
                    <button
                      type="button"
                      className="grid size-9 place-items-center rounded-lg border border-[#DDE5EA] text-slate-600 hover:bg-slate-50"
                      onClick={() => handleOpenEdit(company)}
                      title="Edit Perusahaan"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={company.recordsCount > 0 || deleteMutation.isPending}
                      className="grid size-9 place-items-center rounded-lg border border-red-100 text-[#D71920] hover:bg-red-50 disabled:opacity-30"
                      onClick={() => setDeletingCompany(company)}
                      title={
                        company.recordsCount > 0
                          ? 'Perusahaan memiliki riwayat kalibrasi dan tidak dapat dihapus'
                          : 'Hapus Perusahaan'
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}

          {!companiesQuery.isLoading && !companies.length && (
            <div className="col-span-full py-16 text-center text-slate-400">
              Belum ada data perusahaan klien yang sesuai.
            </div>
          )}
        </div>
      )}

      {/* Modal Form Create / Edit */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-heading text-lg font-bold text-[#183247]">
                {editingCompany ? 'Edit Perusahaan Klien' : 'Tambah Perusahaan Baru'}
              </h3>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                onClick={() => setIsFormOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))}
              className="space-y-4 text-sm font-semibold text-[#2D3A45]"
            >
              <label className="block space-y-1">
                <span>Nama Perusahaan *</span>
                <Input placeholder="Misal: PT Industri Jaya Utama" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-xs font-normal text-[#D71920]">{form.formState.errors.name.message}</p>
                )}
              </label>

              <label className="block space-y-1">
                <span>Alamat Lengkap</span>
                <textarea
                  className="w-full min-h-20 rounded-[10px] border border-[#DDE5EA] p-3 text-sm font-normal outline-none focus:border-[#1F5F8B]"
                  placeholder="Alamat kantor / pabrik klien..."
                  {...form.register('address')}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span>Telepon / HP</span>
                  <Input placeholder="021-xxxx / 0812xxxx" {...form.register('phone')} />
                </label>

                <label className="block space-y-1">
                  <span>Email Klien</span>
                  <Input placeholder="klien@perusahaan.com" {...form.register('email')} />
                  {form.formState.errors.email && (
                    <p className="text-xs font-normal text-[#D71920]">{form.formState.errors.email.message}</p>
                  )}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="bg-[#D71920] hover:bg-[#B9151B] text-white font-semibold"
                >
                  {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Perusahaan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail & Riwayat Kalibrasi */}
      {selectedCompanyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-xs font-bold text-[#1F5F8B]">DETAIL KLIEN</span>
                <h3 className="font-heading text-xl font-extrabold text-[#183247]">
                  {detailQuery.data?.name ?? 'Memuat...'}
                </h3>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                onClick={() => setSelectedCompanyId(null)}
              >
                <X className="size-5" />
              </button>
            </div>

            {detailQuery.isLoading && (
              <div className="py-12 text-center text-sm text-slate-400">Memuat detail riwayat...</div>
            )}

            {detailQuery.data && (
              <div className="space-y-6 text-sm">
                <div className="space-y-2 rounded-lg bg-[#F8FAFB] p-4 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400">Alamat: </span>
                    <span className="font-semibold text-[#183247]">{detailQuery.data.address || '-'}</span>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <span className="text-slate-400">Telepon: </span>
                      <span className="font-semibold text-[#183247]">{detailQuery.data.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Email: </span>
                      <span className="font-semibold text-[#183247]">{detailQuery.data.email || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="flex items-center justify-between font-heading text-sm font-bold text-[#183247]">
                    <span>Riwayat Kalibrasi Terakhir ({detailQuery.data.records.length})</span>
                    <Link
                      href="/calibrations/new"
                      className="text-xs font-semibold text-[#D71920] hover:underline"
                    >
                      + Kalibrasi Baru
                    </Link>
                  </h4>

                  <div className="divide-y rounded-lg border bg-white">
                    {detailQuery.data.records.map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between p-3.5 text-xs">
                        <div>
                          <p className="font-bold text-[#183247]">{rec.certificateNumber || rec.recordNumber}</p>
                          <p className="text-slate-500">
                            {rec.instrumentForm.code} · {rec.instrumentForm.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {rec.status}
                          </span>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {new Date(rec.createdAt).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      </div>
                    ))}

                    {!detailQuery.data.records.length && (
                      <div className="p-8 text-center text-xs text-slate-400">
                        Belum ada lembar kerja kalibrasi untuk perusahaan ini.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(deletingCompany)}
        title="Hapus Perusahaan Klien"
        description={`Apakah Anda yakin ingin menghapus perusahaan ${deletingCompany?.name ?? ''}? Data perusahaan yang dihapus tidak dapat dikembalikan.`}
        isLoading={deleteMutation.isPending}
        onConfirm={() => deletingCompany && deleteMutation.mutate(deletingCompany.id)}
        onClose={() => setDeletingCompany(null)}
      />
    </div>
  );
}
