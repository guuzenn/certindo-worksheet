import { describe, expect, it } from 'vitest';
import { getInstrumentCellMappings, instrumentForms } from '../../../prisma/instrument-forms';

describe('metadata template instrumen', () => {
  it('mendaftarkan Timbangan sebagai satu kode resmi dengan revisi 04 dan 05', () => {
    const scales = instrumentForms.filter((form) => form.code === 'CCI-KAL-FOM-028');

    expect(scales.map((form) => form.revision).sort()).toEqual(['04', '05']);
    expect(scales.every((form) => !form.needsTemplateReview)).toBe(true);
  });

  it('mempertahankan mapping identitas yang berbeda untuk setiap revisi Timbangan', () => {
    const revision04 = instrumentForms.find((form) => form.code === 'CCI-KAL-FOM-028' && form.revision === '04');
    const revision05 = instrumentForms.find((form) => form.code === 'CCI-KAL-FOM-028' && form.revision === '05');

    expect(revision04).toBeDefined();
    expect(revision05).toBeDefined();
    expect(getInstrumentCellMappings(revision04!).certificateNumber).toEqual(['C6']);
    expect(getInstrumentCellMappings(revision05!).certificateNumber).toEqual(['C7']);
  });

  it('menandai Torque Gauge FOM-152 sebagai template terkonfirmasi', () => {
    const torqueGauge = instrumentForms.find((form) => form.code === 'CCI-KAL-FOM-152');

    expect(torqueGauge).toBeDefined();
    expect(torqueGauge?.needsTemplateReview).not.toBe(true);
  });

  it('mempertahankan dua Mikrometer revision 03 berdasarkan ketertelusuran SI', () => {
    const micrometers = instrumentForms.filter((form) => form.code.startsWith('CCI-KAL-FOM-057'));

    expect(micrometers).toHaveLength(2);
    expect(micrometers.map((form) => form.revision)).toEqual(['03', '03']);
    expect(micrometers.map((form) => form.name)).toEqual([
      'Mikrometer — LK-054-IDN / JCC (Taiwan)',
      'Mikrometer — LK-032-IDN / LK-070-IDN',
    ]);
    expect(micrometers.every((form) => !form.needsTemplateReview)).toBe(true);
  });
});
