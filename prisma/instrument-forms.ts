import generatedIdentityMappingsJson from './generated-identity-mappings.json';

export const currentWorkbookPath = 'storage/templates/Lembar Kerja 095-163.xlsx';
export const earlyWorkbookPath = 'storage/templates/Lembar Kerja 0X-94.xlsx';

export const instrumentFieldOrder = [
  'certificateNumber',
  'name',
  'manufacturer',
  'model',
  'serialNumber',
  'identityNumber',
  'capacity',
  'capacityMin',
  'capacityMax',
  'resolution',
  'ambientTemperatureStart',
  'ambientTemperatureMiddle',
  'ambientTemperatureEnd',
  'calibrationLocation',
  'ambientHumidityStart',
  'ambientHumidityMiddle',
  'ambientHumidityEnd',
] as const;
export type InstrumentFieldKey = (typeof instrumentFieldOrder)[number];

export interface InstrumentFormSeed {
  code: string;
  name: string;
  sheet: string;
  workbook?: string;
  omitFields?: InstrumentFieldKey[];
  cellMappings?: Record<string, string[]>;
  needsTemplateReview?: boolean;
  additionalFields?: Array<{ key: string; label: string; inputType?: 'text' | 'date' | 'textarea'; placeholder?: string }>;
  measurementTables?: Array<{
    id: string;
    title: string;
    rowCount: number;
    columns: Array<{ key: string; label: string; lockedValues?: string[] }>;
  }>;
}

export interface WorksheetTableMapping {
  id: string;
  firstRow: number;
  templateRowCount: number;
  columns: Record<string, string>;
}

const generatedIdentityMappings = generatedIdentityMappingsJson as Record<string, Record<string, string[]>>;

export function getInstrumentCellMappings(form: InstrumentFormSeed): Record<string, string[]> {
  return { ...(generatedIdentityMappings[form.code] ?? {}), ...(form.cellMappings ?? {}) };
}

export function getWorksheetTableMappings(form: InstrumentFormSeed): WorksheetTableMapping[] {
  const cells = getInstrumentCellMappings(form);
  return (form.measurementTables ?? []).flatMap((table) => {
    const columns: Record<string, string> = {};
    let firstRow: number | null = null;
    for (const column of table.columns) {
      const target = cells[`measurements.tables.${table.id}.0.${column.key}`]?.[0];
      const match = target?.match(/^([A-Z]+)(\d+)$/i);
      if (!match?.[1] || !match[2]) continue;
      columns[column.key] = match[1].toUpperCase();
      firstRow ??= Number(match[2]);
    }
    return firstRow && Object.keys(columns).length
      ? [{ id: table.id, firstRow, templateRowCount: table.rowCount, columns }]
      : [];
  });
}

function createGenericTableMappings(
  tableId: string,
  firstRow: number,
  rowCount: number,
  columns: Record<string, string>,
): Record<string, string[]> {
  const mappings: Record<string, string[]> = {};
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    for (const [key, column] of Object.entries(columns)) {
      mappings[`measurements.tables.${tableId}.${rowIndex}.${key}`] = [`${column}${firstRow + rowIndex}`];
    }
  }
  return mappings;
}

const dimensionalAdditionalFields: NonNullable<InstrumentFormSeed['additionalFields']> = [
  { key: 'arrivalDate', label: 'Tanggal Alat Datang', inputType: 'date' },
  { key: 'resolution1', label: 'Resolusi 1' },
  { key: 'resolution2', label: 'Resolusi 2' },
  { key: 'calibrationRange1', label: 'Rentang Kalibrasi 1' },
  { key: 'calibrationRange2', label: 'Rentang Kalibrasi 2' },
  { key: 'supportTool1', label: 'Alat Bantu 1' },
  { key: 'supportTool2', label: 'Alat Bantu 2' },
  { key: 'supportTool3', label: 'Alat Bantu 3' },
  { key: 'standardCondition', label: 'Kondisi Standar' },
  { key: 'instrumentCondition', label: 'Kondisi Alat' },
];

const fiveReadingColumns = [
  { key: 'nominal', label: 'Nominal (mm)' },
  ...Array.from({ length: 5 }, (_, index) => ({ key: `reading${index + 1}`, label: `Pembacaan ke-${index + 1} (mm)` })),
];

const tenReadingColumns = [
  { key: 'nominal', label: 'Nominal (mm)' },
  ...Array.from({ length: 10 }, (_, index) => ({ key: `reading${index + 1}`, label: `Pembacaan ke-${index + 1} (mm)` })),
];

function createDimensionalAdditionalMappings(firstSupportRow: number, hasThirdSupportTool = true): Record<string, string[]> {
  const conditionOffset = hasThirdSupportTool ? 3 : 2;
  return {
    'additionalFields.arrivalDate': ['H10'],
    'additionalFields.resolution1': ['D16'],
    'additionalFields.resolution2': ['D17'],
    'additionalFields.calibrationRange1': ['D18'],
    'additionalFields.calibrationRange2': ['D19'],
    'additionalFields.supportTool1': [`J${firstSupportRow}`],
    'additionalFields.supportTool2': [`J${firstSupportRow + 1}`],
    ...(hasThirdSupportTool ? { 'additionalFields.supportTool3': [`J${firstSupportRow + 2}`] } : {}),
    'additionalFields.standardCondition': [`J${firstSupportRow + conditionOffset}`],
    'additionalFields.instrumentCondition': [`J${firstSupportRow + conditionOffset + 1}`],
    'environment.temperatureStart': ['H13'],
    'environment.temperatureMiddle': ['I13'],
    'environment.temperatureEnd': ['J13'],
    'environment.humidityStart': ['H14'],
    'environment.humidityMiddle': ['I14'],
    'environment.humidityEnd': ['J14'],
  };
}

function createDimensionalInstrumentForm(
  code: string,
  name: string,
  sheet: string,
  nominalFirstRow: number,
  repeatabilityFirstRow: number,
  firstSupportRow: number,
): InstrumentFormSeed {
  return {
    code, name, sheet,
    additionalFields: dimensionalAdditionalFields,
    measurementTables: [
      { id: 'nominal', title: 'A. Pengujian per Nominal', rowCount: 2, columns: fiveReadingColumns },
      { id: 'repeatability', title: 'B. Pengujian Keberulangan', rowCount: 2, columns: tenReadingColumns },
    ],
    cellMappings: {
      ...createDimensionalAdditionalMappings(firstSupportRow),
      ...createGenericTableMappings('nominal', nominalFirstRow, 2, { nominal: 'B', reading1: 'C', reading2: 'D', reading3: 'E', reading4: 'F', reading5: 'G' }),
      ...createGenericTableMappings('repeatability', repeatabilityFirstRow, 2, { nominal: 'B', reading1: 'C', reading2: 'D', reading3: 'E', reading4: 'F', reading5: 'G', reading6: 'H', reading7: 'I', reading8: 'J', reading9: 'K', reading10: 'L' }),
    },
  };
}

const instrumentFieldDataPaths: Record<InstrumentFieldKey, string> = {
  certificateNumber: 'certificateNumber',
  name: 'instrument.name',
  manufacturer: 'instrument.manufacturer',
  model: 'instrument.model',
  serialNumber: 'instrument.serialNumber',
  identityNumber: 'instrument.identityNumber',
  capacity: 'instrument.capacity',
  capacityMin: 'instrument.capacityMin',
  capacityMax: 'instrument.capacityMax',
  resolution: 'instrument.resolution',
  ambientTemperatureStart: 'environment.temperatureStart',
  ambientTemperatureMiddle: 'environment.temperatureMiddle',
  ambientTemperatureEnd: 'environment.temperatureEnd',
  calibrationLocation: 'calibrationLocation',
  ambientHumidityStart: 'environment.humidityStart',
  ambientHumidityMiddle: 'environment.humidityMiddle',
  ambientHumidityEnd: 'environment.humidityEnd',
};

export function getInstrumentFields(form: InstrumentFormSeed): InstrumentFieldKey[] {
  const omitted = new Set(form.omitFields ?? []);
  const cellMappings = getInstrumentCellMappings(form);

  return instrumentFieldOrder.filter(
    (field) => !omitted.has(field) && Boolean(cellMappings[instrumentFieldDataPaths[field]]?.length),
  );
}

function createPressureGaugeForm(code: string, name: string, sheet: string, workbook = earlyWorkbookPath): InstrumentFormSeed {
  return {
    code, name, sheet, workbook,
    measurementTables: [{
      id: 'pressure', title: 'Data Pengukuran Tekanan (Naik - Turun)', rowCount: 1,
      columns: [
        { key: 'nominal', label: 'Penunjukan Standar' },
        { key: 'reading1Up', label: '1 · Naik' }, { key: 'reading1Down', label: '1 · Turun' },
        { key: 'reading2Up', label: '2 · Naik' }, { key: 'reading2Down', label: '2 · Turun' },
        { key: 'reading3Up', label: '3 · Naik' }, { key: 'reading3Down', label: '3 · Turun' },
      ],
    }],
    cellMappings: {
      ...createGenericTableMappings('pressure', 21, 10, {
        nominal: 'B', reading1Up: 'D', reading1Down: 'E', reading2Up: 'F', reading2Down: 'G', reading3Up: 'H', reading3Down: 'I',
      }),
    },
  };
}

function createStandardVsUutForm(
  code: string, name: string, sheet: string, firstRow: number, rowCount = 5, workbook = earlyWorkbookPath,
): InstrumentFormSeed {
  return {
    code, name, sheet, workbook,
    measurementTables: [{
      id: 'measurements', title: 'Data Pengukuran Standar vs Alat', rowCount: 1,
      columns: [
        { key: 'standard', label: 'Penunjukan Standar' },
        { key: 'reading1', label: 'Pembacaan 1' }, { key: 'reading2', label: 'Pembacaan 2' },
        { key: 'reading3', label: 'Pembacaan 3' }, { key: 'reading4', label: 'Pembacaan 4' },
        { key: 'reading5', label: 'Pembacaan 5' },
      ],
    }],
    cellMappings: {
      ...createGenericTableMappings('measurements', firstRow, rowCount, {
        standard: 'B', reading1: 'D', reading2: 'E', reading3: 'F', reading4: 'G', reading5: 'H',
      }),
    },
  };
}

export const instrumentForms: InstrumentFormSeed[] = [
  { code: 'CCI-KAL-FOM-0XX', name: 'Lembar Kerja Umum', sheet: 'Lembar Kerja Umum', workbook: earlyWorkbookPath, needsTemplateReview: true },
  createPressureGaugeForm('CCI-KAL-FOM-010', 'Pressure Gauge', 'Pressure Gauge', earlyWorkbookPath),
  { code: 'CCI-KAL-FOM-027', name: 'Anak Timbangan', sheet: ' Anak Timbangan 04', workbook: earlyWorkbookPath },
  { code: 'CCI-KAL-FOM-028', name: 'Timbangan', sheet: 'Timbangan 05', workbook: earlyWorkbookPath },
  { code: 'CCI-KAL-FOM-028-B', name: 'Timbangan (Varian 2)', sheet: 'TImbangan 04', workbook: earlyWorkbookPath, needsTemplateReview: true },
  {
    code: 'CCI-KAL-FOM-033', name: 'Enklosur', sheet: 'Enklosur 03', workbook: earlyWorkbookPath,
    measurementTables: [{
      id: 'enclosure', title: 'Data Pengukuran Distribusi Suhu Enklosur', rowCount: 1,
      columns: [
        { key: 'setPoint', label: 'Indikator (°C)' },
        { key: 'tu1', label: 'TU 1' }, { key: 'tu2', label: 'TU 2' }, { key: 'tu3', label: 'TU 3' },
        { key: 'tu4', label: 'TU 4' }, { key: 'tu5', label: 'TU 5' }, { key: 'tu6', label: 'TU 6' },
        { key: 'tu7', label: 'TU 7' }, { key: 'tu8', label: 'TU 8' }, { key: 'tu9', label: 'TU 9' },
      ],
    }],
    cellMappings: {
      ...createGenericTableMappings('enclosure', 21, 20, {
        setPoint: 'B', tu1: 'D', tu2: 'E', tu3: 'F', tu4: 'G', tu5: 'H', tu6: 'I', tu7: 'J', tu8: 'K', tu9: 'L',
      }),
    },
  },
  { code: 'CCI-KAL-FOM-053', name: 'Thermohygrometer', sheet: 'Thermohygrometer 04', workbook: earlyWorkbookPath },
  { code: 'CCI-KAL-FOM-054', name: 'Timer / Stopwatch', sheet: 'Timer-Stopwatch 02', workbook: earlyWorkbookPath },
  { code: 'CCI-KAL-FOM-055', name: 'Volumetric Glassware', sheet: 'Volumetric Glassware 04', workbook: earlyWorkbookPath },
  { code: 'CCI-KAL-FOM-056', name: 'Autoclave', sheet: 'Autoclave 04', workbook: earlyWorkbookPath },
  { code: 'CCI-KAL-FOM-057', name: 'Mikrometer', sheet: 'Mikrometer 03', workbook: earlyWorkbookPath },
  { code: 'CCI-KAL-FOM-057-B', name: 'Mikrometer (Varian 2)', sheet: 'Mikrometer-03', workbook: earlyWorkbookPath, needsTemplateReview: true },
  createPressureGaugeForm('CCI-KAL-FOM-058', 'Digital Pressure (FOM-058)', 'Digital Pressure', earlyWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-059', 'Thermometer Digital', 'Thermometer Digital', 18, 5),
  createStandardVsUutForm('CCI-KAL-FOM-060', 'Refractometer', 'Refractometer 03', 18, 5),
  { code: 'CCI-KAL-FOM-061', name: 'Centrifuge (Timer)', sheet: 'Centrifuge (Timer) 02', workbook: earlyWorkbookPath },
  createStandardVsUutForm('CCI-KAL-FOM-062', 'Hydrometer', 'Hydrometer 02', 18, 5),
  createStandardVsUutForm('CCI-KAL-FOM-063', 'Stroboscope', 'Stroboscope 02', 20, 5),
  createStandardVsUutForm('CCI-KAL-FOM-064', 'Termometer Gelas', 'Termometer Gelas 03', 20, 5),
  createStandardVsUutForm('CCI-KAL-FOM-065', 'Tachometer', 'Tachometer 02', 18, 10),
  {
    code: 'CCI-KAL-FOM-066', name: 'Density Meter', sheet: 'Density Meter 03', workbook: earlyWorkbookPath,
    measurementTables: [{
      id: 'density', title: 'Data Pengukuran Density Meter', rowCount: 1,
      columns: [
        { key: 'standard', label: 'Density Standard (g/mL)' },
        { key: 'reading1', label: 'X1 (g/mL)' }, { key: 'reading2', label: 'X2 (g/mL)' }, { key: 'reading3', label: 'X3 (g/mL)' },
        { key: 'temp1', label: 'T1 (°C)' }, { key: 'temp2', label: 'T2 (°C)' }, { key: 'temp3', label: 'T3 (°C)' },
      ],
    }],
    cellMappings: {
      ...createGenericTableMappings('density', 19, 5, {
        standard: 'B', reading1: 'F', reading2: 'G', reading3: 'H', temp1: 'I', temp2: 'J', temp3: 'K',
      }),
    },
  },
  createStandardVsUutForm('CCI-KAL-FOM-067', 'Buret Digital', 'Buret Digital 03', 18, 5),
  createStandardVsUutForm('CCI-KAL-FOM-068', 'Mikropipet', 'Mikropipet 03', 18, 5),
  createStandardVsUutForm('CCI-KAL-FOM-069', 'PH Meter', 'PH Meter 03', 17, 5),
  createStandardVsUutForm('CCI-KAL-FOM-071', 'Force Gauge', 'Force Gauge 05', 20, 10),
  createStandardVsUutForm('CCI-KAL-FOM-072', 'Push Pull', 'Push Pull 06', 20, 10),
  createStandardVsUutForm('CCI-KAL-FOM-073', 'Pull Test Kit', 'Pull Test Kit 05', 20, 10),
  createStandardVsUutForm('CCI-KAL-FOM-074', 'Texture Analyzer', 'Texture Analyzer 05', 20, 10),
  createStandardVsUutForm('CCI-KAL-FOM-075', 'Moisture Analyzer', 'Moisture Analyzer 04', 18, 5),
  createStandardVsUutForm('CCI-KAL-FOM-076', 'Moisture Meter', 'Moisture Meter 01', 18, 5),
  createStandardVsUutForm('CCI-KAL-FOM-077', 'Infrared Thermometer', 'Infrared Thermometer 03', 18, 5),
  createStandardVsUutForm('CCI-KAL-FOM-078', 'Salinity Refractometer', 'Salinity Refractometer 02', 18, 5),
  createStandardVsUutForm('CCI-KAL-FOM-079', 'TDS Meter', 'TDS Meter 02', 18, 5),
  createStandardVsUutForm('CCI-KAL-FOM-080', 'Torque Wrench', 'Torque Wrench 04', 20, 10),
  createStandardVsUutForm('CCI-KAL-FOM-081', 'Torque Screwdriver', 'Torque Screwdriver 04', 20, 10),
  createStandardVsUutForm('CCI-KAL-FOM-082', 'Torque Meter', 'Torque Meter 05', 20, 10),
  createStandardVsUutForm('CCI-KAL-FOM-084', 'Dispensette', 'Dispensete 03', 18, 5),
  {
    code: 'CCI-KAL-FOM-085', name: 'Climatic Chamber', sheet: 'Climatic Chamber 03', workbook: earlyWorkbookPath,
    measurementTables: [{
      id: 'chamber', title: 'Data Pengukuran Distribusi Suhu & Kelembaban', rowCount: 1,
      columns: [
        { key: 'setPoint', label: 'Indikator Suhu/RH' },
        { key: 'tu1', label: 'TU 1' }, { key: 'tu2', label: 'TU 2' }, { key: 'tu3', label: 'TU 3' },
        { key: 'tu4', label: 'TU 4' }, { key: 'tu5', label: 'TU 5' }, { key: 'tu6', label: 'TU 6' },
        { key: 'tu7', label: 'TU 7' }, { key: 'tu8', label: 'TU 8' }, { key: 'tu9', label: 'TU 9' },
      ],
    }],
    cellMappings: {
      ...createGenericTableMappings('chamber', 20, 15, {
        setPoint: 'B', tu1: 'D', tu2: 'E', tu3: 'F', tu4: 'G', tu5: 'H', tu6: 'I', tu7: 'J', tu8: 'K', tu9: 'L',
      }),
    },
  },
  createStandardVsUutForm('CCI-KAL-FOM-087', 'Dry Block', 'Dry Block 04', 18, 5),
  createStandardVsUutForm('CCI-KAL-FOM-088', 'Ruler', 'Ruler 02', 22, 10),
  createStandardVsUutForm('CCI-KAL-FOM-089', 'Temperature Data Logger', 'Temperature Data Logger 05', 18, 5),
  createStandardVsUutForm('CCI-KAL-FOM-090', 'Viscometer', 'Viscometer 02', 17, 5),
  createStandardVsUutForm('CCI-KAL-FOM-091', 'Spektrofotometer', 'Spektrofometer 02', 18, 10),
  createStandardVsUutForm('CCI-KAL-FOM-094', 'Volume Flowrate (Direct)', 'Volume FLowrate(Direct) 02', 18, 5),
  {
    code: 'CCI-KAL-FOM-095', name: 'Height Gauge', sheet: 'Height Gauge',
    additionalFields: dimensionalAdditionalFields,
    measurementTables: [
      { id: 'nominal', title: 'A. Pengujian per Nominal', rowCount: 2, columns: fiveReadingColumns },
      { id: 'repeatability', title: 'B. Pengujian Keberulangan', rowCount: 2, columns: tenReadingColumns },
    ],
    cellMappings: {
      ...createDimensionalAdditionalMappings(48),
      ...createGenericTableMappings('nominal', 25, 2, { nominal: 'B', reading1: 'C', reading2: 'D', reading3: 'E', reading4: 'F', reading5: 'G' }),
      ...createGenericTableMappings('repeatability', 44, 2, { nominal: 'B', reading1: 'C', reading2: 'D', reading3: 'E', reading4: 'F', reading5: 'G', reading6: 'H', reading7: 'I', reading8: 'J', reading9: 'K', reading10: 'L' }),
    },
  },
  {
    code: 'CCI-KAL-FOM-096', name: 'Depth Gauge', sheet: 'Depth Gauge',
    additionalFields: dimensionalAdditionalFields,
    measurementTables: [
      { id: 'nominal', title: 'A. Pengujian per Nominal', rowCount: 2, columns: fiveReadingColumns },
      { id: 'repeatability', title: 'B. Pengujian Keberulangan', rowCount: 2, columns: tenReadingColumns },
    ],
    cellMappings: {
      ...createDimensionalAdditionalMappings(48),
      ...createGenericTableMappings('nominal', 25, 2, { nominal: 'B', reading1: 'C', reading2: 'D', reading3: 'E', reading4: 'F', reading5: 'G' }),
      ...createGenericTableMappings('repeatability', 44, 2, { nominal: 'B', reading1: 'C', reading2: 'D', reading3: 'E', reading4: 'F', reading5: 'G', reading6: 'H', reading7: 'I', reading8: 'J', reading9: 'K', reading10: 'L' }),
    },
  },
  {
    code: 'CCI-KAL-FOM-098', name: 'Caliper', sheet: 'Caliper',
    additionalFields: dimensionalAdditionalFields.filter((field) => field.key !== 'supportTool3'),
    measurementTables: [
      { id: 'parallelism', title: '2. Pengukuran Luar Kesejajaran Muka Ukur', rowCount: 1, columns: [
        { key: 'base', label: 'Pangkal (mm)' }, { key: 'middle', label: 'Tengah (mm)' }, { key: 'tip', label: 'Ujung (mm)' },
      ] },
      { id: 'outside', title: '4. Pengukuran Luar', rowCount: 2, columns: fiveReadingColumns },
      { id: 'inside', title: '5. Pengukuran Dalam', rowCount: 2, columns: fiveReadingColumns },
      { id: 'depth', title: '6. Pengukuran Kedalaman', rowCount: 2, columns: fiveReadingColumns },
      { id: 'repeatability', title: '7. Pengujian Keberulangan', rowCount: 2, columns: tenReadingColumns },
    ],
    cellMappings: {
      ...createDimensionalAdditionalMappings(80, false),
      ...createGenericTableMappings('parallelism', 24, 1, { base: 'B', middle: 'C', tip: 'D' }),
      ...createGenericTableMappings('outside', 30, 2, { nominal: 'B', reading1: 'C', reading2: 'D', reading3: 'E', reading4: 'F', reading5: 'G' }),
      ...createGenericTableMappings('inside', 45, 2, { nominal: 'B', reading1: 'C', reading2: 'D', reading3: 'E', reading4: 'F', reading5: 'G' }),
      ...createGenericTableMappings('depth', 60, 2, { nominal: 'B', reading1: 'C', reading2: 'D', reading3: 'E', reading4: 'F', reading5: 'G' }),
      ...createGenericTableMappings('repeatability', 76, 2, { nominal: 'B', reading1: 'C', reading2: 'D', reading3: 'E', reading4: 'F', reading5: 'G', reading6: 'H', reading7: 'I', reading8: 'J', reading9: 'K', reading10: 'L' }),
    },
  },
  createStandardVsUutForm('CCI-KAL-FOM-099', 'Conductivity Meter', 'Condutictivity Meter', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-100', 'Hot Plate Stirrer', 'Hot Plate Stirrer', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-101', 'Bejana Ukur', 'Bejana Ukur', 18, 5, currentWorkbookPath),
  createPressureGaugeForm('CCI-KAL-FOM-102', 'Magnehelic', 'Magnehelic', currentWorkbookPath),
  createDimensionalInstrumentForm('CCI-KAL-FOM-103', 'Dial Gauge & Digital Indikator', 'Dial Gauge & Digital Indikator', 25, 41, 45),
  createDimensionalInstrumentForm('CCI-KAL-FOM-103-B', 'Dial Gauge & Digital Indikator (Varian 2)', 'Dial Gauge & Digital Indika (2)', 25, 41, 45),
  createDimensionalInstrumentForm('CCI-KAL-FOM-104', 'Wall Thickness Gauge', 'Wall Thickness Gauge', 25, 41, 45),
  createDimensionalInstrumentForm('CCI-KAL-FOM-105', 'Thickness Gauge', 'Thickness Gauge', 25, 41, 45),
  {
    code: 'CCI-KAL-FOM-106', name: 'Liquid Bath', sheet: 'Liquid Bath', workbook: currentWorkbookPath,
    measurementTables: [{
      id: 'liquidBath', title: 'Data Pengukuran Kestabilan & Keseragaman Suhu', rowCount: 1,
      columns: [
        { key: 'point', label: 'Titik Ukur (°C)' },
        { key: 'std', label: 'Pembacaan Standar' }, { key: 'uut', label: 'Pembacaan UUT' },
      ],
    }],
    cellMappings: {
      ...createGenericTableMappings('liquidBath', 18, 20, { point: 'A', uut: 'D', std: 'E' }),
    },
  },
  { code: 'CCI-KAL-FOM-109', name: 'Timbangan Jembatan', sheet: 'Timbangan Jembatan', workbook: currentWorkbookPath, omitFields: ['identityNumber'] },
  createStandardVsUutForm('CCI-KAL-FOM-111', 'Turbidity Meter', 'Turbidity Meter', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-112', 'Chlorine Meter', 'Chlorine Meter', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-113', 'Zahn Cup', 'Zahn Cup', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-114', 'AW Meter', 'AW Meter', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-115', 'Coating Thickness Meter', 'Coating Thickness Meter', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-116', 'Mixing Machine', 'Mixing Machine', 18, 5, currentWorkbookPath),
  createDimensionalInstrumentForm('CCI-KAL-FOM-118', 'Sink Depth Gauge', 'Sink Depth Gauge', 25, 41, 45),
  createDimensionalInstrumentForm('CCI-KAL-FOM-119', 'Scale Loupe', 'Scale Loupe', 26, 42, 46),
  createDimensionalInstrumentForm('CCI-KAL-FOM-120', 'Ultrasonic Thickness Gauge', 'Ultrasonic Thickness Gauge', 25, 41, 45),
  createStandardVsUutForm('CCI-KAL-FOM-122', 'Temperature Gauge', 'Temperature Gauge', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-125', 'Mass Flowmeter', 'Mass Flowmeter', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-129', 'Totalizer Flowmeter', 'Totalizer Flowmeter', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-130', 'Meter BBM (Volumetrik)', 'Meter BBM (Volumetrik)', 18, 5, currentWorkbookPath),
  {
    code: 'CCI-KAL-FOM-134', name: 'Furnace', sheet: 'Furnace', workbook: currentWorkbookPath,
    measurementTables: [{
      id: 'furnace', title: 'Data Pengukuran Distribusi Suhu Furnace', rowCount: 1,
      columns: [
        { key: 'setPoint', label: 'Indikator (°C)' },
        { key: 'tu1', label: 'TU 1' }, { key: 'tu2', label: 'TU 2' }, { key: 'tu3', label: 'TU 3' }, { key: 'tu4', label: 'TU 4' }, { key: 'tu5', label: 'TU 5' },
      ],
    }],
    cellMappings: {
      ...createGenericTableMappings('furnace', 21, 15, { setPoint: 'C', tu1: 'E', tu2: 'F', tu3: 'G', tu4: 'H', tu5: 'I' }),
    },
  },
  {
    code: 'CCI-KAL-FOM-135', name: 'Pin Gauge', sheet: 'Pin Gauge', workbook: currentWorkbookPath, omitFields: ['resolution'],
    additionalFields: dimensionalAdditionalFields,
    measurementTables: [{
      id: 'pinGauge', title: 'Pengujian per Nominal', rowCount: 18,
      columns: [
        { key: 'number', label: 'No.', lockedValues: Array.from({ length: 18 }, (_, index) => String(Math.floor(index / 3) + 1)) },
        { key: 'nominal', label: 'Nominal (mm)' }, { key: 'identity', label: 'Identitas / Serial No.' },
        { key: 'position', label: 'Posisi', lockedValues: Array.from({ length: 18 }, (_, index) => ['Tengah', 'Atas', 'Bawah'][index % 3] ?? '') },
        { key: 'reading1', label: 'Ke-1 (mm)' }, { key: 'reading2', label: 'Ke-2 (mm)' },
        { key: 'reading3', label: 'Ke-3 (mm)' }, { key: 'reading4', label: 'Ke-4 (mm)' },
        { key: 'reading5', label: 'Ke-5 (mm)' },
      ],
    }],
    cellMappings: {
      'additionalFields.arrivalDate': ['H9'],
      'additionalFields.resolution1': ['D15'], 'additionalFields.resolution2': ['D16'],
      'additionalFields.calibrationRange1': ['D17'], 'additionalFields.calibrationRange2': ['D18'],
      'additionalFields.supportTool1': ['J44'], 'additionalFields.supportTool2': ['J45'],
      'additionalFields.supportTool3': ['J46'], 'additionalFields.standardCondition': ['J47'],
      'additionalFields.instrumentCondition': ['J48'],
      'environment.temperatureStart': ['H12'], 'environment.temperatureMiddle': ['I12'], 'environment.temperatureEnd': ['J12'],
      'environment.humidityStart': ['H13'], 'environment.humidityMiddle': ['I13'], 'environment.humidityEnd': ['J13'],
      ...createGenericTableMappings('pinGauge', 24, 18, {
        number: 'B', nominal: 'C', identity: 'D', position: 'E', reading1: 'F', reading2: 'G', reading3: 'H', reading4: 'I', reading5: 'J',
      }),
    },
  },
  createStandardVsUutForm('CCI-KAL-FOM-140', 'Metal Detector', 'Metal Detector', 16, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-141', 'Magnet atau Listrik', 'Magnet atau Listrik', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-142', 'Gauss atau Tesla Meter', 'Gauss atau Tesla Meter', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-143', 'Magnet Trap', 'Magnet Trap', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-144', 'Metal Test Piece', 'Metal Test Piece', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-146', 'X-Ray', 'X-RAY', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-147', 'Biosafety Cabinet', 'Biosafety Cabinet', 18, 5, currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-148', 'RPM Meter', 'RPM Meter', 18, 5, currentWorkbookPath),
  createPressureGaugeForm('CCI-KAL-FOM-149', 'Digital Pressure', 'Digital Pressure', currentWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-150', 'Tangki Ukur', 'Tangki Ukur', 18, 5, currentWorkbookPath),
  {
    code: 'CCI-KAL-FOM-152',
    name: 'Torque Gauge',
    sheet: 'Torque Gauge',
    needsTemplateReview: true,
    measurementTables: [
      { id: 'clockwise', title: 'Clockwise', rowCount: 10, columns: [
        { key: 'indication', label: 'Penunjukan Alat' },
        ...Array.from({ length: 5 }, (_, index) => ({ key: `reading${index + 1}`, label: `Standar ${index + 1}` })),
      ] },
      { id: 'counterClockwise', title: 'Counter Clockwise', rowCount: 11, columns: [
        { key: 'indication', label: 'Penunjukan Alat' },
        ...Array.from({ length: 5 }, (_, index) => ({ key: `reading${index + 1}`, label: `Standar ${index + 1}` })),
      ] },
    ],
    cellMappings: {
      certificateNumber: ['C7', 'C44'],
      calibrationDate: ['F7', 'F44'],
      'instrument.name': ['C8', 'C45'],
      'instrument.manufacturer': ['C9', 'C46'],
      'instrument.model': ['C10', 'C47'],
      'instrument.serialNumber': ['C11', 'C48'],
      'instrument.identityNumber': ['C12', 'C49'],
      'instrument.capacity': ['C13', 'C50'],
      'instrument.resolution': ['C14', 'C51'],
      'environment.temperatureStart': ['F13', 'F50'],
      'environment.temperatureEnd': ['G13', 'G50'],
      'company.name': ['F10', 'F47'],
      ...createGenericTableMappings('clockwise', 56, 10, { indication: 'B', reading1: 'D', reading2: 'E', reading3: 'F', reading4: 'G', reading5: 'H' }),
      ...createGenericTableMappings('counterClockwise', 70, 11, { indication: 'B', reading1: 'D', reading2: 'E', reading3: 'F', reading4: 'G', reading5: 'H' }),
    },
  },
  {
    code: 'CCI-KAL-FOM-153',
    name: 'Dissolved Oxygen Meter',
    sheet: 'DISSOLVED OXYGEN METER',
    measurementTables: [{
      id: 'dissolvedOxygen', title: 'Data Pengukuran Dissolved Oxygen Meter', rowCount: 4,
      columns: [
        { key: 'number', label: 'No.', lockedValues: ['1', '2', '3', '4'] },
        { key: 'standard', label: 'Standar DO' }, { key: 'resolution', label: 'Resolusi' },
        { key: 'reading1', label: 'DO1' }, { key: 'reading2', label: 'DO2' }, { key: 'reading3', label: 'DO3' },
      ],
    }],
    cellMappings: {
      certificateNumber: ['C7'],
      calibrationDate: ['F7'],
      calibrationLocation: ['F8'],
      'instrument.name': ['C8'],
      'instrument.serialNumber': ['C9'],
      'instrument.identityNumber': ['C10'],
      'instrument.model': ['C11'],
      'instrument.manufacturer': ['C12'],
      'instrument.capacity': ['C13'],
      'instrument.resolution': ['C14'],
      'environment.temperatureStart': ['F13'],
      'environment.temperatureEnd': ['G13'],
      'environment.humidityStart': ['F14'],
      'environment.humidityEnd': ['G14'],
      'company.name': ['F10'],
      ...createGenericTableMappings('dissolvedOxygen', 19, 4, {
        number: 'B', standard: 'C', resolution: 'D', reading1: 'E', reading2: 'F', reading3: 'G',
      }),
    },
  },
  {
    code: 'CCI-KAL-FOM-157', name: 'Pressure Transmitter', sheet: 'Pressure Transmitter',
    additionalFields: [
      { key: 'otherInformation', label: 'Informasi Lainnya' },
      { key: 'heightDifference1', label: 'Perbedaan Ketinggian h1 (cm)' },
      { key: 'heightDifference2', label: 'Perbedaan Ketinggian h2 (cm)' },
    ],
    measurementTables: [{
      id: 'pressureTransmitter', title: 'Data Pengukuran Pressure Transmitter', rowCount: 14,
      columns: [
        { key: 'standard', label: 'Penunjukan Standar' },
        { key: 'reading1Up', label: '1 · Naik' }, { key: 'reading1Down', label: '1 · Turun' },
        { key: 'reading2Up', label: '2 · Naik' }, { key: 'reading2Down', label: '2 · Turun' },
        { key: 'reading3Up', label: '3 · Naik' }, { key: 'reading3Down', label: '3 · Turun' },
      ],
    }],
    cellMappings: {
      certificateNumber: ['C7'], calibrationDate: ['F7'], calibrationLocation: ['F8'],
      'instrument.name': ['C8'], 'instrument.serialNumber': ['C9'], 'instrument.identityNumber': ['C10'],
      'instrument.manufacturer': ['C11'], 'instrument.model': ['C12'], 'instrument.capacity': ['C13'],
      'instrument.resolution': ['C14'], 'company.name': ['F10'],
      'environment.temperatureStart': ['F14'], 'environment.temperatureEnd': ['G14'],
      'environment.humidityStart': ['F15'], 'environment.humidityEnd': ['G15'],
      'additionalFields.otherInformation': ['F12'], 'additionalFields.heightDifference1': ['C15'],
      'additionalFields.heightDifference2': ['D15'],
      ...createGenericTableMappings('pressureTransmitter', 21, 14, {
        standard: 'B', reading1Up: 'C', reading1Down: 'D', reading2Up: 'E',
        reading2Down: 'F', reading3Up: 'G', reading3Down: 'H',
      }),
    },
  },
  {
    code: 'CCI-KAL-FOM-160', name: 'Spectroquant Photometer', sheet: 'SPECTROQUANT PHOTOMETER',
    measurementTables: [{
      id: 'spectroquant', title: 'Data Pengukuran Spectroquant Photometer', rowCount: 4,
      columns: [
        { key: 'number', label: 'No.' }, { key: 'standard', label: 'Value Standard' },
        { key: 'unit', label: 'Satuan' }, { key: 'reading1', label: 'Penunjukan 1' },
        { key: 'reading2', label: 'Penunjukan 2' }, { key: 'reading3', label: 'Penunjukan 3' },
        { key: 'reading4', label: 'Penunjukan 4' }, { key: 'reading5', label: 'Penunjukan 5' },
      ],
    }],
    cellMappings: {
      certificateNumber: ['C7'], calibrationDate: ['F7'], calibrationLocation: ['F8'],
      'instrument.name': ['C8'], 'instrument.serialNumber': ['C9'], 'instrument.identityNumber': ['C10'],
      'instrument.model': ['C11'], 'instrument.manufacturer': ['C12'], 'instrument.capacity': ['C13'],
      'instrument.resolution': ['C14'], 'company.name': ['F10'],
      'environment.temperatureStart': ['F13'], 'environment.temperatureEnd': ['G13'],
      'environment.humidityStart': ['F14'], 'environment.humidityEnd': ['G14'],
      ...createGenericTableMappings('spectroquant', 19, 4, {
        number: 'B', standard: 'C', unit: 'D', reading1: 'E', reading2: 'F', reading3: 'G', reading4: 'H', reading5: 'I',
      }),
    },
  },
  {
    code: 'CCI-KAL-FOM-161', name: 'Alat Ukur Warna', sheet: 'Alat Ukur Warna',
    measurementTables: [
      {
        id: 'colorFirst', title: 'Data Pengukuran Warna 1', rowCount: 6,
        columns: [
          { key: 'number', label: 'No.' }, { key: 'color', label: 'Colour', lockedValues: ['L*', 'a*', 'b*'] },
          { key: 'standard', label: 'Standard Value' }, { key: 'x1', label: 'X1' }, { key: 'x2', label: 'X2' },
          { key: 'x3', label: 'X3' }, { key: 'x4', label: 'X4' }, { key: 'x5', label: 'X5' },
        ],
      },
      {
        id: 'colorSecond', title: 'Data Pengukuran Warna 2', rowCount: 7,
        columns: [
          { key: 'number', label: 'No.' }, { key: 'color', label: 'Colour', lockedValues: ['L*', 'a*', 'b*'] },
          { key: 'standard', label: 'Standard Value' }, { key: 'x1', label: 'X1' }, { key: 'x2', label: 'X2' },
          { key: 'x3', label: 'X3' }, { key: 'x4', label: 'X4' }, { key: 'x5', label: 'X5' },
        ],
      },
    ],
    cellMappings: {
      certificateNumber: ['C7'], calibrationDate: ['F7'], calibrationLocation: ['F8'],
      'instrument.name': ['C8'], 'instrument.serialNumber': ['C9'], 'instrument.identityNumber': ['C10'],
      'instrument.manufacturer': ['C11'], 'instrument.model': ['C12'], 'instrument.capacity': ['C13'],
      'instrument.resolution': ['C14'], 'company.name': ['F10'],
      'environment.temperatureStart': ['F13'], 'environment.temperatureEnd': ['G13'],
      'environment.humidityStart': ['F14'], 'environment.humidityEnd': ['G14'],
      ...createGenericTableMappings('colorFirst', 19, 6, { number: 'B', color: 'C', standard: 'D', x1: 'E', x2: 'F', x3: 'G', x4: 'H', x5: 'I' }),
      ...createGenericTableMappings('colorSecond', 28, 7, { number: 'B', color: 'C', standard: 'D', x1: 'E', x2: 'F', x3: 'G', x4: 'H', x5: 'I' }),
    },
  },
  {
    code: 'CCI-KAL-FOM-162', name: 'Temperature Mapping', sheet: 'Temperature Mapping',
    additionalFields: [{ key: 'additionalInformation', label: 'Keterangan Tambahan' }, { key: 'mappingData', label: 'Data / Sketsa Temperature Mapping', inputType: 'textarea' }],
    cellMappings: {
      certificateNumber: ['C7'], calibrationDate: ['F7'], calibrationLocation: ['F8'],
      'instrument.name': ['C8'], 'instrument.serialNumber': ['C9'], 'instrument.manufacturer': ['C10'],
      'instrument.model': ['C11'], 'instrument.identityNumber': ['C12'], 'instrument.capacity': ['C13'],
      'instrument.resolution': ['C14'], 'company.name': ['F10'],
      'environment.temperatureStart': ['F13'], 'environment.temperatureEnd': ['G13'],
      'environment.humidityStart': ['F14'], 'environment.humidityEnd': ['G14'],
      'additionalFields.additionalInformation': ['F11'], 'additionalFields.mappingData': ['B16'],
    },
  },
  {
    code: 'CCI-KAL-FOM-163', name: 'Feeler Gauge', sheet: 'Feeler Gauge', omitFields: ['resolution'],
    additionalFields: [
      { key: 'arrivalDate', label: 'Tanggal Alat Datang', inputType: 'date' },
      { key: 'resolution1', label: '8a. Resolusi 1' }, { key: 'resolution2', label: '8b. Resolusi 2' },
      { key: 'calibrationRange1', label: 'Rentang Kalibrasi 1' }, { key: 'calibrationRange2', label: 'Rentang Kalibrasi 2' },
      { key: 'supportTool1', label: 'Alat Bantu 1' }, { key: 'supportTool2', label: 'Alat Bantu 2' },
      { key: 'supportTool3', label: 'Alat Bantu 3' }, { key: 'standardCondition', label: 'Kondisi Standar' },
      { key: 'instrumentCondition', label: 'Kondisi Alat' },
    ],
    measurementTables: [{
      id: 'feelerGauge', title: 'Pengujian per Nominal', rowCount: 18,
      columns: [
        { key: 'number', label: 'No.', lockedValues: Array.from({ length: 18 }, (_, index) => String(Math.floor(index / 3) + 1)) },
        { key: 'nominal', label: 'Nominal (mm)' }, { key: 'identity', label: 'Identitas / Serial No.' },
        { key: 'position', label: 'Posisi', lockedValues: Array.from({ length: 18 }, (_, index) => ['Tengah', 'Atas', 'Bawah'][index % 3] ?? '') },
        { key: 'reading1', label: 'Ke-1 (mm)' }, { key: 'reading2', label: 'Ke-2 (mm)' },
        { key: 'reading3', label: 'Ke-3 (mm)' }, { key: 'reading4', label: 'Ke-4 (mm)' },
        { key: 'reading5', label: 'Ke-5 (mm)' },
      ],
    }],
    cellMappings: {
      certificateNumber: ['C7'], 'company.name': ['F7'], 'instrument.name': ['C8'], calibrationLocation: ['F8'],
      'instrument.manufacturer': ['C9'], 'additionalFields.arrivalDate': ['F9'], 'instrument.identityNumber': ['C10'],
      calibrationDate: ['F10'], 'instrument.serialNumber': ['C11'], 'instrument.model': ['C12'],
      'instrument.capacityMin': ['C13'], 'instrument.capacityMax': ['C14'],
      'additionalFields.resolution1': ['C15'], 'additionalFields.resolution2': ['C16'],
      'additionalFields.calibrationRange1': ['C17'], 'additionalFields.calibrationRange2': ['C18'],
      'environment.temperatureStart': ['F12'], 'environment.temperatureMiddle': ['G12'], 'environment.temperatureEnd': ['H12'],
      'environment.humidityStart': ['F13'], 'environment.humidityMiddle': ['G13'], 'environment.humidityEnd': ['H13'],
      'additionalFields.supportTool1': ['E49'], 'additionalFields.supportTool2': ['E50'], 'additionalFields.supportTool3': ['E51'],
      'additionalFields.standardCondition': ['E52'], 'additionalFields.instrumentCondition': ['E53'],
      ...createGenericTableMappings('feelerGauge', 24, 18, {
        number: 'B', nominal: 'C', identity: 'D', position: 'E', reading1: 'F', reading2: 'G', reading3: 'H', reading4: 'I', reading5: 'J',
      }),
    },
  },
];
