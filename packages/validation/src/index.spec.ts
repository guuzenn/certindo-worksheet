import { describe, expect, it } from 'vitest';
import { createCalibrationSchema, loginSchema } from './index';

describe('loginSchema', () => {
  it('menormalkan email pengguna', () => {
    expect(loginSchema.parse({ email: 'ADMIN@CERTINDO.CO.ID', password: 'Rahasia123!' }).email).toBe(
      'admin@certindo.co.id',
    );
  });

  it('menolak kata sandi pendek', () => {
    expect(loginSchema.safeParse({ email: 'admin@certindo.co.id', password: '123' }).success).toBe(false);
  });
});

describe('createCalibrationSchema', () => {
  it('menerima draft kalibrasi dengan identitas alat lengkap', () => {
    const result = createCalibrationSchema.safeParse({
      companyId: 'company-1',
      instrumentFormId: 'form-1',
      formData: {
        calibrationDate: '2026-08-04',
        instrument: {
          name: 'Digital Torque Gauge',
          manufacturer: 'Example',
          model: 'TG-10',
          serialNumber: 'SN-001',
          capacity: '10 N·m',
          resolution: '0,01 N·m',
        },
        notes: '',
      },
    });
    expect(result.success).toBe(true);
  });

  it('menolak draft tanpa nomor seri', () => {
    const result = createCalibrationSchema.safeParse({
      companyId: 'company-1', instrumentFormId: 'form-1',
      formData: { calibrationDate: '2026-08-04', instrument: { name: 'Torque Gauge', manufacturer: '', model: '', serialNumber: '', capacity: '', resolution: '' }, notes: '' },
    });
    expect(result.success).toBe(false);
  });
});
