import { describe, expect, it } from 'vitest';
import { formatIndonesianDate } from './format';

describe('formatIndonesianDate', () => {
  it('memformat tanggal dengan locale Indonesia', () => {
    expect(formatIndonesianDate('2026-08-04T00:00:00.000Z')).toContain('2026');
  });
});
