import { describe, expect, it } from 'vitest';
import { calibrationStatusTransitionSchema, createCalibrationSchema, loginSchema } from './index';

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

describe('calibrationStatusTransitionSchema', () => {
  it('mewajibkan catatan saat meminta perbaikan', () => {
    expect(calibrationStatusTransitionSchema.safeParse({ status: 'DRAFT' }).success).toBe(false);
    expect(calibrationStatusTransitionSchema.safeParse({ status: 'DRAFT', note: 'Periksa kembali hasil ukur.' }).success).toBe(true);
  });

  it('menerima pengajuan review tanpa catatan', () => {
    expect(calibrationStatusTransitionSchema.safeParse({ status: 'UNDER_REVIEW' }).success).toBe(true);
  });
});

describe('createCalibrationSchema', () => {
  it('menerima draft kalibrasi dengan identitas alat lengkap', () => {
    const result = createCalibrationSchema.safeParse({
      companyId: 'company-1',
      instrumentFormId: 'form-1',
      certificateNumber: 'CTD/CAL/CERT-001',
      formData: {
        calibrationDate: '2026-08-04',
        calibrationLocation: '',
        instrument: {
          name: 'Digital Torque Gauge',
          manufacturer: 'Example',
          model: 'TG-10',
          serialNumber: 'SN-001',
          identityNumber: 'ID-001',
          capacity: '10 N·m',
          capacityMin: '',
          capacityMax: '',
          resolution: '0,01 N·m',
        },
        environment: { temperatureStart: '23', temperatureMiddle: '', temperatureEnd: '24', humidityStart: '', humidityMiddle: '', humidityEnd: '' },
        measurements: { clockwise: Array.from({ length: 10 }, () => ({ indication: '', readings: ['', '', '', '', ''] })), counterClockwise: Array.from({ length: 11 }, () => ({ indication: '', readings: ['', '', '', '', ''] })), dissolvedOxygen: Array.from({ length: 4 }, (_, index) => ({ number: String(index + 1), standard: '', resolution: '', readings: ['', '', ''] })), tables: {} },
        additionalFields: {},
        notes: '',
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.formData.measurements.clockwise).toHaveLength(10);
      expect(result.data.formData.measurements.counterClockwise).toHaveLength(11);
      expect(result.data.formData.measurements.dissolvedOxygen).toHaveLength(4);
    }
  });

  it('menerima lima pembacaan standar untuk setiap titik Torque Gauge', () => {
    const result = createCalibrationSchema.safeParse({
      companyId: 'company-1', instrumentFormId: 'form-1', certificateNumber: 'CTD/CAL/CERT-002',
      formData: {
        calibrationDate: '2026-08-04',
        calibrationLocation: '',
        instrument: { name: 'Torque Gauge', manufacturer: '', model: '', serialNumber: 'SN-002', identityNumber: '', capacity: '', capacityMin: '', capacityMax: '', resolution: '' },
        environment: { temperatureStart: '', temperatureMiddle: '', temperatureEnd: '', humidityStart: '', humidityMiddle: '', humidityEnd: '' },
        measurements: {
          clockwise: Array.from({ length: 10 }, () => ({ indication: '1', readings: ['1', '1', '1', '1', '1'] })),
          counterClockwise: Array.from({ length: 11 }, () => ({ indication: '1', readings: ['1', '1', '1', '1', '1'] })),
          dissolvedOxygen: Array.from({ length: 4 }, (_, index) => ({ number: String(index + 1), standard: '0', resolution: '0.01', readings: ['0', '0', '0'] })),
          tables: {},
        },
        additionalFields: {},
        notes: '',
      },
    });
    expect(result.success).toBe(true);
  });

  it('menerima draft tanpa nomor seri untuk template yang memang tidak memilikinya', () => {
    const result = createCalibrationSchema.safeParse({
      companyId: 'company-1', instrumentFormId: 'form-1', certificateNumber: 'CTD/CAL/CERT-001',
      formData: {
        calibrationDate: '2026-08-04', calibrationLocation: '',
        instrument: { name: 'Torque Gauge', manufacturer: '', model: '', serialNumber: '', identityNumber: '', capacity: '', capacityMin: '', capacityMax: '', resolution: '' },
        environment: { temperatureStart: '', temperatureMiddle: '', temperatureEnd: '', humidityStart: '', humidityMiddle: '', humidityEnd: '' },
        measurements: {
          clockwise: Array.from({ length: 10 }, () => ({ indication: '', readings: ['', '', '', '', ''] })),
          counterClockwise: Array.from({ length: 11 }, () => ({ indication: '', readings: ['', '', '', '', ''] })),
          dissolvedOxygen: Array.from({ length: 4 }, () => ({ number: '', standard: '', resolution: '', readings: ['', '', ''] })),
          tables: {},
        },
        additionalFields: {}, notes: '',
      },
    });
    expect(result.success).toBe(true);
  });

  it('menolak nomor sertifikat yang hanya berisi prefix', () => {
    const result = createCalibrationSchema.safeParse({
      companyId: 'company-1', instrumentFormId: 'form-1', certificateNumber: 'CTD/CAL/',
      formData: { calibrationDate: '2026-08-04', instrument: { name: 'Torque Gauge', manufacturer: '', model: '', serialNumber: 'SN-001', identityNumber: '', capacity: '', capacityMin: '', capacityMax: '', resolution: '' }, environment: { temperatureStart: '', temperatureMiddle: '', temperatureEnd: '' }, measurements: { clockwise: Array.from({ length: 10 }, () => ({ indication: '', readings: ['', '', '', '', ''] })), counterClockwise: Array.from({ length: 11 }, () => ({ indication: '', readings: ['', '', '', '', ''] })) }, notes: '' },
    });
    expect(result.success).toBe(false);
  });
});
