import { describe, expect, it } from 'vitest';
import {
  getInstrumentCellMappings,
  getInstrumentFields,
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
    expect(general?.instrumentNameDefault).toBe('');
    expect(general?.fieldLabels).toMatchObject({
      calibrationDate: 'Tanggal Uji',
      calibrationLocation: 'Lokasi Uji',
      company: 'Nama Pemilik/Perusahaan',
      name: 'Nama Alat/Bahan',
      model: 'Type / Model / Kode',
      serialNumber: 'No. Seri / No. Lot / Batch',
    });
    const table = general?.measurementTables?.[0];
    expect(table).toMatchObject({
      id: 'measurements',
      initialRowCount: 1,
      templateRowCount: 14,
      minRows: 1,
      maxRows: 14,
      layout: 'record-grid',
      preserveTemplateRows: true,
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
      preserveTemplateRows: true,
      columns: {
        parameter: 'A',
        uut1: 'C', uut2: 'D', uut3: 'E', uut4: 'F', uut5: 'G',
        standard1: 'H', standard2: 'I', standard3: 'J', standard4: 'K', standard5: 'L',
      },
    }]);
    expect(getInstrumentCellMappings(general!)).toMatchObject({
      certificateNumber: ['C7'],
      calibrationDate: ['H7'],
      calibrationLocation: ['H8'],
      'instrument.name': ['C8'],
      'instrument.manufacturer': ['C9'],
      'instrument.model': ['C10'],
      'instrument.serialNumber': ['C11'],
      'instrument.identityNumber': ['C12'],
      'instrument.capacity': ['C13'],
      'instrument.resolution': ['C14'],
      'environment.temperatureStart': ['H13'],
      'environment.temperatureEnd': ['J13'],
      'environment.humidityStart': ['H14'],
      'environment.humidityEnd': ['J14'],
      'company.name': ['H10'],
      'additionalFields.testMethod': ['H9'],
      'additionalFields.additionalInformation': ['H11'],
      'additionalFields.capacityUnit': ['D13'],
      'additionalFields.resolutionUnit': ['D14'],
      'additionalFields.standardName': ['C34'],
      'measurements.tables.measurements.0.parameter': ['A18'],
      'measurements.tables.measurements.0.uut1': ['C18'],
      'measurements.tables.measurements.0.standard5': ['L18'],
      'measurements.tables.measurements.13.parameter': ['A31'],
      'measurements.tables.measurements.13.standard5': ['L31'],
      'additionalFields.standardManufacturer': ['C35'],
      'additionalFields.standardSerialNumber': ['C36'],
      'additionalFields.standardTraceability': ['C37'],
      'additionalFields.standardUncertainty': ['C38'],
    });
    expect(getInstrumentFields(general!)).toEqual([
      'certificateNumber', 'name', 'manufacturer', 'model', 'serialNumber', 'identityNumber',
      'capacity', 'resolution', 'ambientTemperatureStart', 'ambientTemperatureEnd',
      'calibrationLocation', 'ambientHumidityStart', 'ambientHumidityEnd',
    ]);
    expect(general?.additionalFields).toEqual([
      { key: 'testMethod', label: 'Metode Uji', defaultValue: 'CCI-KAL-WI-037' },
      { key: 'additionalInformation', label: 'Keterangan Tambahan' },
      { key: 'capacityUnit', label: 'Satuan Kapasitas', placeholder: 'Contoh: kg', exportPrefix: '(', exportSuffix: ')' },
      { key: 'resolutionUnit', label: 'Satuan Resolusi', placeholder: 'Contoh: g', exportPrefix: '(', exportSuffix: ')' },
      { key: 'standardName', label: 'Standar yang digunakan', section: 'Data Standar' },
      { key: 'standardManufacturer', label: 'Merk', section: 'Data Standar' },
      { key: 'standardSerialNumber', label: 'No. Seri / No. Lot', section: 'Data Standar' },
      { key: 'standardTraceability', label: 'Tertelusur ke SI', section: 'Data Standar' },
      { key: 'standardUncertainty', label: 'Ketidakpastian', section: 'Data Standar' },
    ]);
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
