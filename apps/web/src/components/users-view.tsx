'use client';

import type { UserItem } from '@certindo/types';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@certindo/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  Edit2,
  Filter,
  KeyRound,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput } from '@certindo/validation';
import { apiRequest } from '@/lib/api';

const roleLabels: Record<UserItem['role'], string> = {
  ADMIN: 'System Admin',
  TECHNICIAN: 'Teknisi Kalibrasi',
  REVIEWER: 'Peninjau (Reviewer)',
  APPROVER: 'Manajer (Approver)',
};

const roleColors: Record<UserItem['role'], string> = {
  ADMIN: 'bg-red-50 text-[#D71920] border-red-200',
  TECHNICIAN: 'bg-[#EEF5FA] text-[#1F5F8B] border-[#D3E4F0]',
  REVIEWER: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVER: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

export function UsersView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const queryParams = new URLSearchParams({
    ...(search ? { search } : {}),
    ...(roleFilter ? { role: roleFilter } : {}),
  }).toString();

  const usersQuery = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => apiRequest<UserItem[]>(`/users${queryParams ? `?${queryParams}` : ''}`),
  });

  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', email: '', password: '', role: 'TECHNICIAN' },
  });

  const updateForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { name: '', email: '', password: '', role: 'TECHNICIAN' },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateUserInput) =>
      apiRequest('/users', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsFormOpen(false);
      createForm.reset({ name: '', email: '', password: '', role: 'TECHNICIAN' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateUserInput) =>
      apiRequest(`/users/${editingUser?.id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsFormOpen(false);
      setEditingUser(null);
      updateForm.reset({ name: '', email: '', password: '', role: 'TECHNICIAN' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  function handleOpenCreate() {
    setEditingUser(null);
    createForm.reset({ name: '', email: '', password: '', role: 'TECHNICIAN' });
    setIsFormOpen(true);
  }

  function handleOpenEdit(user: UserItem) {
    setEditingUser(user);
    updateForm.reset({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
    });
    setIsFormOpen(true);
  }

  const users = usersQuery.data ?? [];

  const stats = {
    total: users.length,
    technicians: users.filter((u) => u.role === 'TECHNICIAN').length,
    reviewersApprovers: users.filter((u) => u.role === 'REVIEWER' || u.role === 'APPROVER').length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="flex flex-col justify-between gap-5 rounded-xl border bg-white p-6 shadow-[0_5px_18px_rgba(24,50,71,0.06)] sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[#D71920]">Manajemen Hak Akses</p>
          <h2 className="mt-1 font-heading text-2xl font-extrabold text-[#183247]">
            Daftar Pengguna & Staf Kalibrasi
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Kelola staf teknisi, peninjau, manajer approver, dan admin sistem. Atur peran hak akses serta kredensial kata sandi.
          </p>
        </div>
        <Button
          type="button"
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#D71920] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#B9151B]"
          onClick={handleOpenCreate}
        >
          <UserPlus className="size-4" /> Tambah Staf Baru
        </Button>
      </section>

      {/* Summary Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Pengguna</p>
              <p className="mt-2 font-heading text-3xl font-extrabold text-[#183247]">
                {usersQuery.isLoading ? '—' : stats.total}
              </p>
              <p className="mt-1 text-xs text-slate-400">Akun aktif terdaftar</p>
            </div>
            <span className="grid size-10 place-items-center rounded-[10px] bg-[#EEF5FA] text-[#1F5F8B]">
              <Users className="size-5" />
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Teknisi Kalibrasi</p>
              <p className="mt-2 font-heading text-3xl font-extrabold text-[#183247]">
                {usersQuery.isLoading ? '—' : stats.technicians}
              </p>
              <p className="mt-1 text-xs text-slate-400">Petugas input lembar kerja</p>
            </div>
            <span className="grid size-10 place-items-center rounded-[10px] bg-blue-50 text-blue-700">
              <Wrench className="size-5" />
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">Reviewer & Approver</p>
              <p className="mt-2 font-heading text-3xl font-extrabold text-[#183247]">
                {usersQuery.isLoading ? '—' : stats.reviewersApprovers}
              </p>
              <p className="mt-1 text-xs text-slate-400">Manajer peninjau sertifikat</p>
            </div>
            <span className="grid size-10 place-items-center rounded-[10px] bg-amber-50 text-amber-700">
              <UserCheck className="size-5" />
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm font-medium text-slate-500">System Admin</p>
              <p className="mt-2 font-heading text-3xl font-extrabold text-[#183247]">
                {usersQuery.isLoading ? '—' : stats.admins}
              </p>
              <p className="mt-1 text-xs text-slate-400">Akses penuh sistem</p>
            </div>
            <span className="grid size-10 place-items-center rounded-[10px] bg-red-50 text-[#D71920]">
              <ShieldCheck className="size-5" />
            </span>
          </CardContent>
        </Card>
      </section>

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <label className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
              <input
                className="h-11 w-full rounded-[10px] border border-[#DDE5EA] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#1F5F8B]"
                placeholder="Cari pengguna berdasarkan nama atau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <select
              className="h-11 rounded-[10px] border border-[#DDE5EA] bg-white px-3.5 text-sm font-medium text-slate-600 outline-none focus:border-[#1F5F8B]"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">Semua Peran (Role)</option>
              <option value="TECHNICIAN">Teknisi Kalibrasi</option>
              <option value="REVIEWER">Peninjau (Reviewer)</option>
              <option value="APPROVER">Manajer (Approver)</option>
              <option value="ADMIN">System Admin</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users List Grid */}
      {usersQuery.isError && (
        <div className="rounded-[10px] border border-red-100 bg-[#FDEBEC] p-4 text-sm text-[#B9151B]">
          Gagal memuat daftar pengguna. Pastikan server API dan database terhubung.
        </div>
      )}

      {!usersQuery.isError && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {usersQuery.isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="space-y-3 p-5">
                  <div className="h-6 w-3/4 rounded bg-slate-200" />
                  <div className="h-4 w-1/2 rounded bg-slate-200" />
                </CardContent>
              </Card>
            ))}

          {!usersQuery.isLoading &&
            users.map((u) => {
              const initials = u.name
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')
                .toUpperCase();

              return (
                <Card
                  key={u.id}
                  className="flex flex-col justify-between transition-all hover:border-[#1F5F8B]/40 hover:shadow-md"
                >
                  <CardHeader className="space-y-3 p-5 pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#183247] font-heading font-extrabold text-sm text-white">
                          {initials}
                        </div>
                        <div>
                          <CardTitle className="line-clamp-1 font-heading text-base font-bold text-[#183247]">
                            {u.name}
                          </CardTitle>
                          <p className="line-clamp-1 text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <span
                        className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold ${roleColors[u.role]}`}
                      >
                        {roleLabels[u.role]}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 p-5 pt-0">
                    <div className="flex items-center justify-between rounded-lg bg-[#F8FAFB] p-3 text-xs text-slate-600">
                      <span className="text-slate-400">Lembar Kerja Dibuat:</span>
                      <span className="font-bold text-[#183247]">{u.createdRecordsCount} Sertifikat</span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#E3E8ED]">
                      <Button
                        variant="outline"
                        className="flex-1 text-xs gap-1.5"
                        onClick={() => handleOpenEdit(u)}
                      >
                        <Edit2 className="size-3.5" /> Edit / Reset Password
                      </Button>
                      <button
                        type="button"
                        disabled={u.createdRecordsCount > 0 || deleteMutation.isPending}
                        className="grid size-9 place-items-center rounded-lg border border-red-100 text-[#D71920] hover:bg-red-50 disabled:opacity-30"
                        onClick={() => {
                          if (confirm(`Hapus pengguna ${u.name}?`)) {
                            deleteMutation.mutate(u.id);
                          }
                        }}
                        title={
                          u.createdRecordsCount > 0
                            ? 'Pengguna pernah membuat lembar kerja dan tidak dapat dihapus'
                            : 'Hapus Pengguna'
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

          {!usersQuery.isLoading && !users.length && (
            <div className="col-span-full py-16 text-center text-slate-400">
              Belum ada pengguna yang sesuai dengan pencarian.
            </div>
          )}
        </div>
      )}

      {/* Modal Form Create / Edit User */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-heading text-lg font-bold text-[#183247]">
                {editingUser ? `Edit Staf: ${editingUser.name}` : 'Tambah Staf Baru'}
              </h3>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                onClick={() => setIsFormOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>

            {editingUser ? (
              /* Edit User Form */
              <form
                onSubmit={updateForm.handleSubmit((data) => updateMutation.mutate(data))}
                className="space-y-4 text-sm font-semibold text-[#2D3A45]"
              >
                <label className="block space-y-1">
                  <span>Nama Pengguna *</span>
                  <Input placeholder="Nama Lengkap Staf" {...updateForm.register('name')} />
                  {updateForm.formState.errors.name && (
                    <p className="text-xs font-normal text-[#D71920]">
                      {updateForm.formState.errors.name.message}
                    </p>
                  )}
                </label>

                <label className="block space-y-1">
                  <span>Email *</span>
                  <Input placeholder="email@certindo.co.id" {...updateForm.register('email')} />
                  {updateForm.formState.errors.email && (
                    <p className="text-xs font-normal text-[#D71920]">
                      {updateForm.formState.errors.email.message}
                    </p>
                  )}
                </label>

                <label className="block space-y-1">
                  <span>Peran Hak Akses (Role) *</span>
                  <select
                    className="h-11 w-full rounded-[10px] border border-[#DDE5EA] bg-white px-3.5 text-sm font-normal outline-none focus:border-[#1F5F8B]"
                    {...updateForm.register('role')}
                  >
                    <option value="TECHNICIAN">Teknisi Kalibrasi</option>
                    <option value="REVIEWER">Peninjau (Reviewer)</option>
                    <option value="APPROVER">Manajer (Approver)</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                </label>

                <label className="block space-y-1 pt-2 border-t">
                  <span className="flex items-center gap-1.5 text-[#1F5F8B]">
                    <KeyRound className="size-4" /> Reset Kata Sandi (Opsional)
                  </span>
                  <Input
                    type="password"
                    placeholder="Kosongkan jika tidak ingin mereset password..."
                    {...updateForm.register('password')}
                  />
                  {updateForm.formState.errors.password && (
                    <p className="text-xs font-normal text-[#D71920]">
                      {updateForm.formState.errors.password.message}
                    </p>
                  )}
                </label>

                <div className="flex items-center justify-end gap-3 pt-3 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="bg-[#D71920] hover:bg-[#B9151B] text-white font-semibold"
                  >
                    {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                </div>
              </form>
            ) : (
              /* Create User Form */
              <form
                onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
                className="space-y-4 text-sm font-semibold text-[#2D3A45]"
              >
                <label className="block space-y-1">
                  <span>Nama Lengkap Staf *</span>
                  <Input placeholder="Misal: Bambang Hermawan" {...createForm.register('name')} />
                  {createForm.formState.errors.name && (
                    <p className="text-xs font-normal text-[#D71920]">
                      {createForm.formState.errors.name.message}
                    </p>
                  )}
                </label>

                <label className="block space-y-1">
                  <span>Email Akun *</span>
                  <Input placeholder="bambang@certindo.co.id" {...createForm.register('email')} />
                  {createForm.formState.errors.email && (
                    <p className="text-xs font-normal text-[#D71920]">
                      {createForm.formState.errors.email.message}
                    </p>
                  )}
                </label>

                <label className="block space-y-1">
                  <span>Kata Sandi Awal *</span>
                  <Input
                    type="password"
                    placeholder="Minimal 8 karakter..."
                    {...createForm.register('password')}
                  />
                  {createForm.formState.errors.password && (
                    <p className="text-xs font-normal text-[#D71920]">
                      {createForm.formState.errors.password.message}
                    </p>
                  )}
                </label>

                <label className="block space-y-1">
                  <span>Peran Hak Akses (Role) *</span>
                  <select
                    className="h-11 w-full rounded-[10px] border border-[#DDE5EA] bg-white px-3.5 text-sm font-normal outline-none focus:border-[#1F5F8B]"
                    {...createForm.register('role')}
                  >
                    <option value="TECHNICIAN">Teknisi Kalibrasi</option>
                    <option value="REVIEWER">Peninjau (Reviewer)</option>
                    <option value="APPROVER">Manajer (Approver)</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                </label>

                <div className="flex items-center justify-end gap-3 pt-3 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="bg-[#D71920] hover:bg-[#B9151B] text-white font-semibold"
                  >
                    {createMutation.isPending ? 'Menambah...' : 'Tambah Staf'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
