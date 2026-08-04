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

export const calibrationFormDataSchema = z.object({
  calibrationDate: z.string().min(1, 'Tanggal kalibrasi wajib diisi'),
  instrument: z.object({
    name: z.string().trim().min(1, 'Nama alat wajib diisi'),
    manufacturer: z.string().trim(),
    model: z.string().trim(),
    serialNumber: z.string().trim().min(1, 'Nomor seri wajib diisi'),
    capacity: z.string().trim(),
    resolution: z.string().trim(),
  }),
  notes: z.string().trim(),
});

export const createCalibrationSchema = z.object({
  companyId: z.string().min(1, 'Perusahaan wajib dipilih'),
  instrumentFormId: z.string().min(1, 'Template instrumen wajib dipilih'),
  formData: calibrationFormDataSchema,
});

export const updateCalibrationSchema = createCalibrationSchema.omit({ instrumentFormId: true }).partial({ companyId: true }).extend({
  formData: calibrationFormDataSchema,
});

export type CalibrationFormDataInput = z.infer<typeof calibrationFormDataSchema>;
export type CreateCalibrationInput = z.infer<typeof createCalibrationSchema>;
export type UpdateCalibrationInput = z.infer<typeof updateCalibrationSchema>;
