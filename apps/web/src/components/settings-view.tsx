'use client';

import type { AuthUser } from '@certindo/types';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@certindo/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  User,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from '@certindo/validation';
import { apiRequest } from '@/lib/api';

const roleLabels: Record<AuthUser['role'], string> = {
  ADMIN: 'System Admin',
  TECHNICIAN: 'Teknisi Kalibrasi',
  REVIEWER: 'Peninjau (Reviewer)',
  APPROVER: 'Manajer (Approver)',
};

const roleColors: Record<AuthUser['role'], string> = {
  ADMIN: 'bg-red-50 text-[#D71920] border-red-200',
  TECHNICIAN: 'bg-[#EEF5FA] text-[#1F5F8B] border-[#D3E4F0]',
  REVIEWER: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVER: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

export function SettingsView() {
  const queryClient = useQueryClient();
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiRequest<AuthUser>('/auth/me'),
  });

  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: '' },
  });

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (meQuery.data) {
      profileForm.reset({ name: meQuery.data.name });
    }
  }, [meQuery.data, profileForm]);

  const updateProfileMutation = useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiRequest('/auth/profile', { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 4000);
    },
  });

  const user = meQuery.data;

  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header Banner */}
      <section className="rounded-xl border bg-white p-6 shadow-[0_5px_18px_rgba(24,50,71,0.06)]">
        <p className="text-sm font-semibold text-[#D71920]">Pengaturan Akun</p>
        <h2 className="mt-1 font-heading text-2xl font-extrabold text-[#183247]">
          Profil & Keamanan Kata Sandi
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Kelola informasi profil pribadi dan perbarui kata sandi akun PT Certindonesia Anda secara aman.
        </p>
      </section>

      {/* Summary Profile Card */}
      <Card>
        <CardContent className="p-6">
          {meQuery.isLoading && <div className="py-4 text-center text-sm text-slate-400">Memuat profil...</div>}
          {user && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="grid size-16 shrink-0 place-items-center rounded-full bg-[#183247] font-heading font-extrabold text-xl text-white shadow-md">
                  {initials}
                </div>
                <div>
                  <h3 className="font-heading text-xl font-bold text-[#183247]">{user.name}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <Mail className="size-3.5 text-slate-400" />
                    <span>{user.email}</span>
                  </div>
                </div>
              </div>

              <div>
                <span
                  className={`inline-block rounded-md border px-3 py-1.5 text-xs font-semibold ${roleColors[user.role]}`}
                >
                  {roleLabels[user.role]}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 1: Edit Profile Name */}
      <Card>
        <CardHeader className="p-6 pb-2">
          <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#183247]">
            <User className="size-5 text-[#1F5F8B]" /> Informasi Profil
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {profileSuccess && (
            <div className="flex items-center gap-2 rounded-[10px] bg-emerald-50 border border-emerald-200 p-4 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              Nama profil berhasil diperbarui.
            </div>
          )}

          <form
            onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))}
            className="space-y-4 text-sm font-semibold text-[#2D3A45]"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span>Nama Lengkap *</span>
                <Input placeholder="Nama Lengkap" {...profileForm.register('name')} />
                {profileForm.formState.errors.name && (
                  <p className="text-xs font-normal text-[#D71920]">
                    {profileForm.formState.errors.name.message}
                  </p>
                )}
              </label>

              <label className="block space-y-1">
                <span>Email Akun (Tidak dapat diubah)</span>
                <Input value={user?.email ?? ''} disabled className="bg-slate-100 opacity-70" />
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="bg-[#1F5F8B] hover:bg-[#184d72] text-white font-semibold"
              >
                {updateProfileMutation.isPending ? 'Menyimpan...' : 'Simpan Profil'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Section 2: Change Password */}
      <Card>
        <CardHeader className="p-6 pb-2">
          <CardTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#183247]">
            <Lock className="size-5 text-[#D71920]" /> Keamanan Kata Sandi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {passwordSuccess && (
            <div className="flex items-center gap-2 rounded-[10px] bg-emerald-50 border border-emerald-200 p-4 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              Kata sandi Anda berhasil diperbarui.
            </div>
          )}

          {changePasswordMutation.isError && (
            <div className="rounded-[10px] bg-[#FDEBEC] border border-red-100 p-4 text-sm font-normal text-[#B9151B]">
              {changePasswordMutation.error instanceof Error
                ? changePasswordMutation.error.message
                : 'Gagal merubah kata sandi. Pastikan kata sandi saat ini sesuai.'}
            </div>
          )}

          <form
            onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))}
            className="space-y-4 text-sm font-semibold text-[#2D3A45]"
          >
            <label className="block space-y-1">
              <span>Kata Sandi Saat Ini *</span>
              <Input
                type="password"
                placeholder="Masukkan kata sandi lama Anda..."
                {...passwordForm.register('currentPassword')}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs font-normal text-[#D71920]">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span>Kata Sandi Baru *</span>
                <Input
                  type="password"
                  placeholder="Minimal 8 karakter..."
                  {...passwordForm.register('newPassword')}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs font-normal text-[#D71920]">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </label>

              <label className="block space-y-1">
                <span>Konfirmasi Kata Sandi Baru *</span>
                <Input
                  type="password"
                  placeholder="Ulangi kata sandi baru..."
                  {...passwordForm.register('confirmPassword')}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs font-normal text-[#D71920]">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="bg-[#D71920] hover:bg-[#B9151B] text-white font-semibold gap-1.5"
              >
                <KeyRound className="size-4" />
                {changePasswordMutation.isPending ? 'Memproses...' : 'Ubah Kata Sandi'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
