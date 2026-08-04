'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Input } from '@certindo/ui';
import { loginSchema, type LoginInput } from '@certindo/validation';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Brand } from '@/components/brand';
import { apiRequest } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(input: LoginInput): Promise<void> {
    setServerError(undefined);
    try {
      const result = await apiRequest<{ accessToken: string }>('/auth/login', {
        method: 'POST', body: JSON.stringify(input),
      });
      window.localStorage.setItem('certindo_access_token', result.accessToken);
      router.replace('/dashboard');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Tidak dapat masuk. Silakan coba lagi.');
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden overflow-hidden bg-[#183247] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-80 rounded-full border-[56px] border-white/[0.035]" />
        <Brand inverse />
        <div className="relative max-w-xl pb-12">
          <div className="mb-6 h-1 w-14 rounded bg-[#D71920]" />
          <h1 className="font-heading text-4xl font-extrabold leading-tight xl:text-5xl">Presisi dalam setiap proses kalibrasi.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Kelola lembar kerja, proses pemeriksaan, dan dokumen kalibrasi dalam satu sistem yang aman dan terstruktur.</p>
        </div>
        <p className="text-xs text-slate-400">PT Certindonesia · Sistem Internal</p>
      </section>

      <section className="flex items-center justify-center bg-[#F5F7F9] px-4 py-10 sm:px-8">
        <Card className="w-full max-w-[460px] p-2 sm:p-5">
          <div className="p-6 pb-2 lg:hidden"><Brand /></div>
          <div className="p-6">
            <p className="text-sm font-semibold text-[#D71920]">Selamat datang</p>
            <h2 className="mt-2 font-heading text-3xl font-extrabold text-[#183247]">Masuk ke akun Anda</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Gunakan akun internal Certindo untuk melanjutkan.</p>
          </div>
          <form className="space-y-5 p-6 pt-3" onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
            <label className="block text-sm font-semibold text-[#2D3A45]">
              Email
              <span className="relative mt-2 block">
                <Mail className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
                <Input className="pl-10" type="email" autoComplete="email" placeholder="nama@certindo.co.id" {...register('email')} />
              </span>
              {errors.email && <span className="mt-1.5 block text-xs font-normal text-[#D71920]">{errors.email.message}</span>}
            </label>
            <label className="block text-sm font-semibold text-[#2D3A45]">
              Kata sandi
              <span className="relative mt-2 block">
                <LockKeyhole className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
                <Input className="pl-10" type="password" autoComplete="current-password" placeholder="Minimal 8 karakter" {...register('password')} />
              </span>
              {errors.password && <span className="mt-1.5 block text-xs font-normal text-[#D71920]">{errors.password.message}</span>}
            </label>
            {serverError && <div role="alert" className="rounded-[10px] border border-red-100 bg-[#FDEBEC] px-4 py-3 text-sm text-[#B9151B]">{serverError}</div>}
            <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Memproses…' : 'Masuk'} {!isSubmitting && <ArrowRight className="size-4" />}
            </Button>
          </form>
        </Card>
      </section>
    </main>
  );
}
