import { z } from 'zod';

const emptyAsUndefined = (value: unknown): unknown => value === '' ? undefined : value;

export const envSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),
  PORT: z.coerce.number().int().positive().optional(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  STORAGE_DRIVER: z.enum(['local', 'blob']).default('local'),
  STORAGE_LOCAL_ROOT: z.string().default('./storage'),
  BLOB_READ_WRITE_TOKEN: z.preprocess(emptyAsUndefined, z.string().min(1).optional()),
  TEMPLATE_EARLY_URL: z.preprocess(emptyAsUndefined, z.string().url().optional()),
  TEMPLATE_CURRENT_URL: z.preprocess(emptyAsUndefined, z.string().url().optional()),
});

export const loginSchema = z.object({
  email: z.email('Email tidak valid').transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
});

export type LoginInput = z.infer<typeof loginSchema>;

const torqueMeasurementRowSchema = z.object({
  indication: z.string().trim(),
  readings: z.array(z.string().trim()).length(5),
});

const dissolvedOxygenMeasurementRowSchema = z.object({
  number: z.string().trim(),
  standard: z.string().trim(),
  resolution: z.string().trim(),
  readings: z.array(z.string().trim()).length(3),
});

export const calibrationFormDataSchema = z.object({
  calibrationDate: z.string().min(1, 'Tanggal kalibrasi wajib diisi'),
  calibrationLocation: z.string().trim(),
  instrument: z.object({
    name: z.string().trim(),
    manufacturer: z.string().trim(),
    model: z.string().trim(),
    serialNumber: z.string().trim(),
    identityNumber: z.string().trim(),
    capacity: z.string().trim(),
    capacityMin: z.string().trim(),
    capacityMax: z.string().trim(),
    resolution: z.string().trim(),
  }),
  environment: z.object({
    temperatureStart: z.string().trim(),
    temperatureMiddle: z.string().trim(),
    temperatureEnd: z.string().trim(),
    humidityStart: z.string().trim(),
    humidityMiddle: z.string().trim(),
    humidityEnd: z.string().trim(),
  }),
  measurements: z.object({
    clockwise: z.array(torqueMeasurementRowSchema).length(10),
    counterClockwise: z.array(torqueMeasurementRowSchema).length(11),
    dissolvedOxygen: z.array(dissolvedOxygenMeasurementRowSchema).length(4),
    tables: z.record(z.string(), z.array(z.record(z.string(), z.string().trim()))),
  }),
  additionalFields: z.record(z.string(), z.string().trim()),
  notes: z.string().trim(),
});

export const createCalibrationSchema = z.object({
  companyId: z.string().min(1, 'Perusahaan wajib dipilih'),
  instrumentFormId: z.string().min(1, 'Template instrumen wajib dipilih'),
  certificateNumber: z.string().trim().regex(/^CTD\/CAL\/.+/, 'Nomor sertifikat setelah CTD/CAL/ wajib diisi'),
  formData: calibrationFormDataSchema,
});

export const updateCalibrationSchema = createCalibrationSchema.omit({ instrumentFormId: true }).partial({ companyId: true }).extend({
  certificateNumber: z.string().trim().regex(/^CTD\/CAL\/.+/, 'Nomor sertifikat setelah CTD/CAL/ wajib diisi'),
  formData: calibrationFormDataSchema,
});

export type CalibrationFormDataInput = z.infer<typeof calibrationFormDataSchema>;
export type CreateCalibrationInput = z.infer<typeof createCalibrationSchema>;
export type UpdateCalibrationInput = z.infer<typeof updateCalibrationSchema>;
