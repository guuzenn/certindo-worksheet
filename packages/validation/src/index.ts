import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_ROOT: z.string().default('./storage'),
});

export const loginSchema = z.object({
  email: z.email('Email tidak valid').transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
});

export type LoginInput = z.infer<typeof loginSchema>;
