import { describe, expect, it } from 'vitest';
import {
  getInstrumentCellMappings,
  getMeasurementTableLeafColumns,
  getWorksheetTableMappings,
  instrumentForms,
} from '../../../prisma/instrument-forms';

describe('metadata template instrumen', () => {
  it('mendaftarkan Timbangan sebagai satu kode resmi dengan revisi 04 dan 05', () => {
    const scales = instrumentForms.filter((form) => form.code === 'CCI-KAL-FOM-028');

    expect(scales.map((form) => form.revision).sort()).toEqual(['04', '05']);
    expect(scales.map((form) => form.sheet).sort()).toEqual(['TImbangan 04', 'Timbangan 05']);
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
    expect(torqueGauge?.mappingVerified).toBe(true);
  });

  it('memodelkan Lembar Kerja Umum sesuai header bertingkat dan 14 baris workbook', () => {
    const general = instrumentForms.find((form) => form.code === 'CCI-KAL-FOM-0XX');

    expect(general).toBeDefined();
    expect(general?.revision).toBe('02');
    expect(general?.mappingVerified).toBe(true);
    const table = general?.measurementTables?.[0];
    expect(table).toMatchObject({
      id: 'measurements',
      initialRowCount: 14,
      templateRowCount: 14,
      minRows: 14,
      maxRows: 14,
      fixedRows: true,
    });
    expect(getMeasurementTableLeafColumns(table?.columns ?? []).map((column) => column.key)).toEqual([
      'parameter',
      'uut1', 'uut2', 'uut3', 'uut4', 'uut5',
      'standard1', 'standard2', 'standard3', 'standard4', 'standard5',
    ]);
    expect(getWorksheetTableMappings(general!)).toEqual([{
      id: 'measurements',
      firstRow: 18,
      templateRowCount: 14,
      columns: {
        parameter: 'A',
        uut1: 'C', uut2: 'D', uut3: 'E', uut4: 'F', uut5: 'G',
        standard1: 'H', standard2: 'I', standard3: 'J', standard4: 'K', standard5: 'L',
      },
    }]);
    expect(getInstrumentCellMappings(general!)).toMatchObject({
      'measurements.tables.measurements.0.parameter': ['A18'],
      'measurements.tables.measurements.0.uut1': ['C18'],
      'measurements.tables.measurements.0.standard5': ['L18'],
      'measurements.tables.measurements.13.parameter': ['A31'],
      'measurements.tables.measurements.13.standard5': ['L31'],
    });
  });

  it('mempertahankan dua Mikrometer revision 03 berdasarkan ketertelusuran SI', () => {
    const micrometers = instrumentForms.filter((form) => form.code.startsWith('CCI-KAL-FOM-057'));

    expect(micrometers).toHaveLength(2);
    expect(micrometers.map((form) => form.revision)).toEqual(['03', '03']);
    expect(micrometers.map((form) => form.name)).toEqual([
      'Mikrometer — LK-054-IDN / JCC (Taiwan)',
      'Mikrometer — LK-032-IDN / LK-070-IDN',
    ]);
    expect(micrometers.map((form) => form.sheet)).toEqual(['Mikrometer 03', 'Mikrometer-03']);
  });
});
