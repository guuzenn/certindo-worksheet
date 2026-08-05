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

  it.each([
    { revision: '05', identityRow: 7, rowOffset: 0, hasPreAdjustment: true },
    { revision: '04', identityRow: 6, rowOffset: -3, hasPreAdjustment: false },
  ])('memodelkan seluruh tabel Timbangan revisi $revision sesuai workbook', ({ revision, identityRow, rowOffset, hasPreAdjustment }) => {
    const scale = instrumentForms.find((form) => form.code === 'CCI-KAL-FOM-028' && form.revision === revision);

    expect(scale).toBeDefined();
    expect(scale?.mappingVerified).toBe(true);
    expect(scale?.measurementTables?.map((table) => table.id)).toEqual([
      'initialCheck', 'repeatabilityHalf', 'repeatabilityMax', 'correction', 'eccentricity',
    ]);
    expect(scale?.measurementTables?.map((table) => table.rowCount)).toEqual([1, 10, 10, 12, 5]);
    for (const table of scale?.measurementTables ?? []) {
      expect(table).toMatchObject({
        initialRowCount: table.rowCount,
        templateRowCount: table.rowCount,
        minRows: table.rowCount,
        maxRows: table.rowCount,
        fixedRows: true,
        preserveTemplateRows: true,
      });
    }
    const initialHeaderFields = scale?.measurementTables?.find((table) => table.id === 'initialCheck')?.headerFieldKeys;
    expect(initialHeaderFields).toEqual(hasPreAdjustment
      ? ['preAdjustmentCheck', 'initialNominalUnit', 'initialReadingUnit']
      : ['initialNominalUnit', 'initialReadingUnit']);
    expect(scale?.additionalFields?.some((field) => field.key === 'preAdjustmentCheck')).toBe(hasPreAdjustment);
    expect(scale?.conditionalCellMappings).toHaveLength(hasPreAdjustment ? 2 : 0);
    expect(getWorksheetTableMappings(scale!).map(({ id, firstRow, templateRowCount, columns }) => ({ id, firstRow, templateRowCount, columns }))).toEqual([
      { id: 'initialCheck', firstRow: 21 + rowOffset, templateRowCount: 1, columns: { nominal: 'A', z1: 'C', m1: 'E', m2: 'G', z2: 'I' } },
      { id: 'repeatabilityHalf', firstRow: 26 + rowOffset, templateRowCount: 10, columns: { readingNumber: 'A', zi: 'B', mi: 'C', standardIdentification: 'E' } },
      { id: 'repeatabilityMax', firstRow: 26 + rowOffset, templateRowCount: 10, columns: { readingNumber: 'G', zi: 'H', mi: 'I', standardIdentification: 'K' } },
      { id: 'correction', firstRow: 40 + rowOffset, templateRowCount: 12, columns: { nominal: 'A', z1: 'B', m1: 'C', m2: 'D', z2: 'E', standardIdentification: 'F' } },
      { id: 'eccentricity', firstRow: 40 + rowOffset, templateRowCount: 5, columns: { position: 'H', reading: 'J' } },
    ]);
    expect(getInstrumentCellMappings(scale!)).toMatchObject({
      certificateNumber: [`C${identityRow}`],
      calibrationDate: [`H${identityRow}`],
      'company.name': [`H${identityRow + 3}`],
      'additionalFields.calibrationMethod': [`H${identityRow + 2}`],
      'environment.temperatureStart': [`H${identityRow + 6}`],
      'environment.humidityEnd': [`I${identityRow + 7}`],
      'additionalFields.initialNominalUnit': [`A${19 + rowOffset}`],
      'additionalFields.repeatabilityHalfNominal': [`A${24 + rowOffset}`],
      'additionalFields.repeatabilityMaxNominal': [`G${24 + rowOffset}`],
      'additionalFields.correctionNominalUnit': [`A${38 + rowOffset}`],
      'additionalFields.eccentricityReadingUnit': [`J${38 + rowOffset}`],
      'measurements.tables.initialCheck.0.z2': [`I${21 + rowOffset}`],
      'measurements.tables.repeatabilityHalf.9.standardIdentification': [`E${35 + rowOffset}`],
      'measurements.tables.repeatabilityMax.9.standardIdentification': [`K${35 + rowOffset}`],
      'measurements.tables.correction.11.standardIdentification': [`F${51 + rowOffset}`],
      'measurements.tables.eccentricity.4.reading': [`J${44 + rowOffset}`],
    });
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

  it('memodelkan Pressure Gauge 010 lengkap sesuai revisi 03', () => {
    const pressureGauge = instrumentForms.find((form) => form.code === 'CCI-KAL-FOM-010');

    expect(pressureGauge).toBeDefined();
    expect(pressureGauge?.revision).toBe('03');
    expect(pressureGauge?.mappingVerified).toBe(true);
    expect(pressureGauge?.fieldLabels).toMatchObject({
      calibrationDate: 'Tanggal Kalibrasi',
      calibrationLocation: 'Lokasi Kalibrasi',
      company: 'Nama Perusahaan',
      name: 'Nama Alat',
      ambientTemperatureStart: 'Temperature Ruang Awal',
      ambientHumidityEnd: 'Kelembaban Akhir',
    });
    const table = pressureGauge?.measurementTables?.[0];
    expect(table).toMatchObject({
      id: 'pressure',
      initialRowCount: 1,
      templateRowCount: 18,
      minRows: 1,
      maxRows: 18,
      preserveTemplateRows: true,
    });
    expect(getMeasurementTableLeafColumns(table?.columns ?? []).map((column) => column.key)).toEqual([
      'instrumentIndication',
      'standard1Up', 'standard1Down',
      'standard2Up', 'standard2Down',
      'standard3Up', 'standard3Down',
    ]);
    expect(getWorksheetTableMappings(pressureGauge!)).toEqual([{
      id: 'pressure',
      firstRow: 21,
      templateRowCount: 18,
      preserveTemplateRows: true,
      columns: {
        instrumentIndication: 'A',
        standard1Up: 'C', standard1Down: 'D',
        standard2Up: 'E', standard2Down: 'F',
        standard3Up: 'G', standard3Down: 'H',
      },
    }]);
    expect(getInstrumentCellMappings(pressureGauge!)).toMatchObject({
      certificateNumber: ['C7'],
      calibrationDate: ['G7'],
      calibrationLocation: ['G8'],
      'instrument.name': ['C8'],
      'instrument.serialNumber': ['C9'],
      'instrument.identityNumber': ['C10'],
      'company.name': ['G10'],
      'instrument.manufacturer': ['C11'],
      'instrument.model': ['C12'],
      'instrument.capacity': ['C13'],
      'instrument.resolution': ['C14'],
      'environment.temperatureStart': ['G14'],
      'environment.temperatureEnd': ['H14'],
      'environment.humidityStart': ['G15'],
      'environment.humidityEnd': ['H15'],
      'additionalFields.calibrationMethod': ['G9'],
      'additionalFields.additionalInformation': ['G12'],
      'additionalFields.height1': ['C15'],
      'additionalFields.height2': ['D15'],
      'additionalFields.standardIndicationUnit': ['C18'],
      'additionalFields.instrumentIndicationUnit': ['A19'],
      'measurements.tables.pressure.0.instrumentIndication': ['A21'],
      'measurements.tables.pressure.0.standard1Up': ['C21'],
      'measurements.tables.pressure.0.standard3Down': ['H21'],
      'measurements.tables.pressure.17.instrumentIndication': ['A38'],
      'measurements.tables.pressure.17.standard3Down': ['H38'],
      'additionalFields.standardName': ['C40'],
      'additionalFields.standardManufacturer': ['C41'],
      'additionalFields.standardSerialNumber': ['C42'],
      'additionalFields.standardTraceability': ['C43'],
      'additionalFields.standardUncertainty': ['C44'],
    });
    expect(getInstrumentCellMappings(pressureGauge!)['instrument.name']).not.toContain('C18');
    expect(pressureGauge?.additionalFields?.find((field) => field.key === 'standardName')).toMatchObject({
      defaultValue: 'Pressure Gauge STD 20 bar / 700 bar',
      section: 'Data Standar',
    });
  });

  it('memodelkan Anak Timbangan 027 sebagai enam tabel tetap dengan pemisah tiga baris', () => {
    const weights = instrumentForms.find((form) => form.code === 'CCI-KAL-FOM-027');

    expect(weights).toBeDefined();
    expect(weights?.revision).toBe('04');
    expect(weights?.mappingVerified).toBe(true);
    expect(weights?.fieldLabels).toMatchObject({
      calibrationDate: 'Tanggal Kalibrasi',
      calibrationLocation: 'Lokasi Kalibrasi',
      company: 'Nama Pemilik/Perusahaan',
      capacity: 'Kapasitas (gram)',
      resolution: 'Resolusi (gram)',
      ambientHumidityStart: 'Kelembaban Ruang Awal',
      ambientHumidityEnd: 'Kelembaban Ruang Akhir',
    });
    expect(weights?.cellValueFormats).toMatchObject({
      'instrument.capacity': { suffix: ' gram' },
      'instrument.resolution': { suffix: ' gram' },
      'environment.temperatureStart': {},
      'environment.humidityStart': {},
    });
    expect(weights?.measurementTables).toHaveLength(6);
    expect(weights?.measurementTables?.map((table) => table.id)).toEqual([
      'calibration1', 'calibration2', 'calibration3',
      'sensitivity1', 'sensitivity2', 'sensitivity3',
    ]);
    for (const table of weights?.measurementTables ?? []) {
      expect(table).toMatchObject({
        rowCount: 6,
        initialRowCount: 6,
        templateRowCount: 6,
        minRows: 6,
        maxRows: 6,
        fixedRows: true,
        rowGroupSize: 3,
        preserveTemplateRows: true,
      });
      expect(getMeasurementTableLeafColumns(table.columns)).toHaveLength(5);
    }
    expect(getWorksheetTableMappings(weights!).map((table) => ({
      id: table.id,
      firstRow: table.firstRow,
      columns: table.columns,
    }))).toEqual([
      { id: 'calibration1', firstRow: 18, columns: { nominal: 'B', s1: 'C', t1: 'D', t2: 'E', s2: 'F' } },
      { id: 'calibration2', firstRow: 26, columns: { nominal: 'B', s1: 'C', t1: 'D', t2: 'E', s2: 'F' } },
      { id: 'calibration3', firstRow: 34, columns: { nominal: 'B', s1: 'C', t1: 'D', t2: 'E', s2: 'F' } },
      { id: 'sensitivity1', firstRow: 18, columns: { nominalSensitivity: 'H', standard: 'I', test: 'J', testPlusSensitivity: 'K', standardPlusSensitivity: 'L' } },
      { id: 'sensitivity2', firstRow: 26, columns: { nominalSensitivity: 'H', standard: 'I', test: 'J', testPlusSensitivity: 'K', standardPlusSensitivity: 'L' } },
      { id: 'sensitivity3', firstRow: 34, columns: { nominalSensitivity: 'H', standard: 'I', test: 'J', testPlusSensitivity: 'K', standardPlusSensitivity: 'L' } },
    ]);
    expect(getInstrumentCellMappings(weights!)).toMatchObject({
      certificateNumber: ['C6'],
      calibrationDate: ['I6'],
      'instrument.name': ['C7'],
      calibrationLocation: ['I7'],
      'instrument.manufacturer': ['C8'],
      'instrument.model': ['C9'],
      'company.name': ['I9'],
      'instrument.serialNumber': ['C10'],
      'instrument.identityNumber': ['C11'],
      'additionalFields.instrumentClass': ['C12'],
      'instrument.capacity': ['C13'],
      'instrument.resolution': ['C14'],
      'environment.temperatureStart': ['I13'],
      'environment.temperatureEnd': ['K13'],
      'environment.humidityStart': ['I14'],
      'environment.humidityEnd': ['K14'],
      'additionalFields.calibrationMethod': ['I8'],
      'measurements.tables.calibration1.0.nominal': ['B18'],
      'measurements.tables.calibration1.5.s2': ['F23'],
      'measurements.tables.sensitivity3.0.nominalSensitivity': ['H34'],
      'measurements.tables.sensitivity3.5.standardPlusSensitivity': ['L39'],
      'additionalFields.calibratorName': ['A45'],
      'additionalFields.calibratorManufacturer': ['D45'],
      'additionalFields.calibratorSerialNumber': ['G45'],
      'additionalFields.calibratorTraceability': ['I45'],
      'additionalFields.calibratorUncertainty': ['K45'],
    });
    expect(getInstrumentFields(weights!)).toEqual([
      'certificateNumber', 'name', 'manufacturer', 'model', 'serialNumber', 'identityNumber',
      'capacity', 'resolution', 'ambientTemperatureStart', 'ambientTemperatureEnd',
      'calibrationLocation', 'ambientHumidityStart', 'ambientHumidityEnd',
    ]);
    expect(weights?.additionalFields?.map((field) => field.key)).toEqual([
      'calibrationMethod', 'instrumentClass', 'calibratorName', 'calibratorManufacturer',
      'calibratorSerialNumber', 'calibratorTraceability', 'calibratorUncertainty',
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
