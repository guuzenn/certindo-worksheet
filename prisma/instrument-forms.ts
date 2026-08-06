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
  revision?: string;
  name: string;
  sheet: string;
  workbook?: string;
  identityMappingKey?: string;
  omitFields?: InstrumentFieldKey[];
  instrumentNameDefault?: string;
  fieldLabels?: Partial<Record<InstrumentFieldKey | 'calibrationDate' | 'company', string>>;
  cellValueFormats?: Record<string, { prefix?: string; suffix?: string }>;
  conditionalCellMappings?: Array<{
    dataPath: string;
    target: string;
    valueMap: Record<string, string>;
  }>;
  cellMappings?: Record<string, string[]>;
  mappingVerified?: boolean;
  additionalFields?: Array<{
    key: string;
    label: string;
    section?: string;
    inputType?: 'text' | 'date' | 'textarea' | 'select';
    placeholder?: string;
    options?: string[];
    defaultValue?: string;
    readOnly?: boolean;
    exportPrefix?: string;
    exportSuffix?: string;
  }>;
  measurementTables?: MeasurementTableSeed[];
}

export interface MeasurementTableLeafColumnSeed {
  key: string;
  label: string;
  lockedValues?: string[];
  unit?: string;
  rowSpan?: number;
  calculation?: {
    operator: 'subtract';
    minuendKey: string;
    subtrahendKey: string;
  };
  exportPrefix?: string;
  exportSuffix?: string;
  inputType?: 'text' | 'number' | 'select';
  options?: string[];
}

export interface MeasurementTableColumnGroupSeed {
  label: string;
  children: MeasurementTableColumnSeed[];
}

export type MeasurementTableColumnSeed = MeasurementTableLeafColumnSeed | MeasurementTableColumnGroupSeed;

export interface MeasurementTableSeed {
  id: string;
  title: string;
  description?: string;
  layout?: 'table' | 'record-grid';
  rowCount: number;
  initialRowCount?: number;
  templateRowCount?: number;
  minRows?: number;
  maxRows?: number;
  fixedRows?: boolean;
  rowGroupSize?: number;
  headerFieldKeys?: string[];
  preserveTemplateRows?: boolean;
  columns: MeasurementTableColumnSeed[];
}

export interface WorksheetTableMapping {
  id: string;
  firstRow: number;
  templateRowCount: number;
  preserveTemplateRows?: boolean;
  columns: Record<string, string>;
}

const generatedIdentityMappings = generatedIdentityMappingsJson as Record<string, Record<string, string[]>>;

export function getInstrumentCellMappings(form: InstrumentFormSeed): Record<string, string[]> {
  return { ...(generatedIdentityMappings[form.identityMappingKey ?? form.code] ?? {}), ...(form.cellMappings ?? {}) };
}

export function getWorksheetTableMappings(form: InstrumentFormSeed): WorksheetTableMapping[] {
  const cells = getInstrumentCellMappings(form);
  return (form.measurementTables ?? []).flatMap((table) => {
    const columns: Record<string, string> = {};
    let firstRow: number | null = null;
    for (const column of getMeasurementTableLeafColumns(table.columns)) {
      const target = cells[`measurements.tables.${table.id}.0.${column.key}`]?.[0];
      const match = target?.match(/^([A-Z]+)(\d+)$/i);
      if (!match?.[1] || !match[2]) continue;
      columns[column.key] = match[1].toUpperCase();
      firstRow ??= Number(match[2]);
    }
    return firstRow && Object.keys(columns).length
      ? [{
        id: table.id,
        firstRow,
        templateRowCount: table.templateRowCount ?? table.rowCount,
        ...(table.preserveTemplateRows !== undefined
          ? { preserveTemplateRows: table.preserveTemplateRows }
          : {}),
        columns,
      }]
      : [];
  });
}

export function getMeasurementTableLeafColumns(columns: MeasurementTableColumnSeed[]): MeasurementTableLeafColumnSeed[] {
  return columns.flatMap((column) => (
    'key' in column ? [column] : getMeasurementTableLeafColumns(column.children)
  ));
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

const weightCalibrationColumns: MeasurementTableSeed['columns'] = [
  { key: 'nominal', label: 'Nominal Kalibrasi', inputType: 'number' },
  { key: 's1', label: 'S₁ (g)', inputType: 'number' },
  { key: 't1', label: 'T₁ (g)', inputType: 'number' },
  { key: 't2', label: 'T₂ (g)', inputType: 'number' },
  { key: 's2', label: 'S₂ (g)', inputType: 'number' },
];

const weightSensitivityColumns: MeasurementTableSeed['columns'] = [
  { key: 'nominalSensitivity', label: 'Nominal mₛₑₙₛ', inputType: 'number' },
  { key: 'standard', label: 'S (g)', inputType: 'number' },
  { key: 'test', label: 'T (g)', inputType: 'number' },
  { key: 'testPlusSensitivity', label: 'T + mₛₑₙₛ (g)', inputType: 'number' },
  { key: 'standardPlusSensitivity', label: 'S + mₛₑₙₛ (g)', inputType: 'number' },
];

function createSixRowWeightTable(
  id: string,
  title: string,
  columns: MeasurementTableSeed['columns'],
): MeasurementTableSeed {
  return {
    id,
    title,
    description: 'Enam baris tetap, dipisahkan menjadi dua kelompok berisi tiga baris seperti lembar kerja.',
    rowCount: 6,
    initialRowCount: 6,
    templateRowCount: 6,
    minRows: 6,
    maxRows: 6,
    fixedRows: true,
    rowGroupSize: 3,
    preserveTemplateRows: true,
    columns,
  };
}

function createPressureGaugeForm(code: string, name: string, sheet: string, workbook = earlyWorkbookPath): InstrumentFormSeed {
  if (code === 'CCI-KAL-FOM-010') {
    return {
      code,
      revision: '03',
      name,
      sheet,
      workbook,
      mappingVerified: true,
      fieldLabels: {
        calibrationDate: 'Tanggal Kalibrasi',
        company: 'Nama Perusahaan',
        certificateNumber: 'No. Sertifikat',
        name: 'Nama Alat',
        serialNumber: 'No. Seri',
        identityNumber: 'No. Identitas',
        manufacturer: 'Merk',
        model: 'Type/Model',
        capacity: 'Kapasitas (termasuk satuan)',
        resolution: 'Resolusi (termasuk satuan)',
        calibrationLocation: 'Lokasi Kalibrasi',
        ambientTemperatureStart: 'Temperature Ruang Awal',
        ambientTemperatureEnd: 'Temperature Ruang Akhir',
        ambientHumidityStart: 'Kelembaban Awal',
        ambientHumidityEnd: 'Kelembaban Akhir',
      },
      additionalFields: [
        { key: 'calibrationMethod', label: 'Metode Kalibrasi' },
        { key: 'additionalInformation', label: 'Informasi lainnya' },
        { key: 'height1', label: 'Perbedaan ketinggian h₁ (cm)', placeholder: 'Nilai h₁', exportPrefix: 'h₁ : ', exportSuffix: ' cm' },
        { key: 'height2', label: 'Perbedaan ketinggian h₂ (cm)', placeholder: 'Nilai h₂', exportPrefix: 'h₂ : ', exportSuffix: ' cm' },
        { key: 'instrumentIndicationUnit', label: 'Satuan Penunjukan Alat', placeholder: 'Contoh: bar', exportPrefix: '(', exportSuffix: ')' },
        { key: 'standardIndicationUnit', label: 'Satuan Penunjukan Standar', placeholder: 'Contoh: bar', exportPrefix: '(', exportSuffix: ')' },
        { key: 'standardName', label: 'Standar yang digunakan', section: 'Data Standar', defaultValue: 'Pressure Gauge STD 20 bar / 700 bar' },
        { key: 'standardManufacturer', label: 'Merk', section: 'Data Standar', defaultValue: 'Additel / Additel' },
        { key: 'standardSerialNumber', label: 'No. Seri', section: 'Data Standar', defaultValue: '211H18830045 / 211H20070058' },
        { key: 'standardTraceability', label: 'Tertelusur ke SI', section: 'Data Standar' },
        { key: 'standardUncertainty', label: 'Ketidakpastian', section: 'Data Standar' },
      ],
      measurementTables: [{
        id: 'pressure',
        title: 'Data Pengukuran Tekanan',
        description: 'Isi penunjukan alat dan tiga rangkaian penunjukan standar pada arah naik dan turun.',
        rowCount: 18,
        initialRowCount: 1,
        templateRowCount: 18,
        minRows: 1,
        maxRows: 18,
        preserveTemplateRows: true,
        headerFieldKeys: ['instrumentIndicationUnit', 'standardIndicationUnit'],
        columns: [
          { key: 'instrumentIndication', label: 'Penunjukan Alat', inputType: 'number' },
          ...Array.from({ length: 3 }, (_, index) => ({
            label: `Penunjukan Standar ${index + 1}`,
            children: [
              { key: `standard${index + 1}Up`, label: 'Naik', inputType: 'number' as const },
              { key: `standard${index + 1}Down`, label: 'Turun', inputType: 'number' as const },
            ],
          })),
        ],
      }],
      cellMappings: {
        'instrument.name': ['C8'],
        'additionalFields.calibrationMethod': ['G9'],
        'additionalFields.additionalInformation': ['G12'],
        'additionalFields.height1': ['C15'],
        'additionalFields.height2': ['D15'],
        'additionalFields.standardIndicationUnit': ['C18'],
        'additionalFields.instrumentIndicationUnit': ['A19'],
        'additionalFields.standardName': ['C40'],
        'additionalFields.standardManufacturer': ['C41'],
        'additionalFields.standardSerialNumber': ['C42'],
        'additionalFields.standardTraceability': ['C43'],
        'additionalFields.standardUncertainty': ['C44'],
        ...createGenericTableMappings('pressure', 21, 18, {
          instrumentIndication: 'A',
          standard1Up: 'C', standard1Down: 'D',
          standard2Up: 'E', standard2Down: 'F',
          standard3Up: 'G', standard3Down: 'H',
        }),
      },
    };
  }

  if (code === 'CCI-KAL-FOM-058') {
    return {
      code,
      revision: '00',
      name,
      sheet,
      workbook,
      mappingVerified: true,
      fieldLabels: verifiedFieldLabels,
      additionalFields: [
        { key: 'calibrationMethod', label: 'Metode Kalibrasi', defaultValue: 'CCI-KAL-WI-088' },
        { key: 'additionalInformation', label: 'Informasi lainnya', exportPrefix: 'Informasi lainnya : ' },
        { key: 'instrumentIndicationUnit', label: 'Satuan Penunjukan Alat', placeholder: 'Contoh: bar', exportPrefix: '(', exportSuffix: ')' },
        { key: 'standardIndicationUnit', label: 'Satuan Penunjukan Standar', placeholder: 'Contoh: bar', exportPrefix: '(', exportSuffix: ')' },
        ...standardDataFields({
          name: 'Pressure Gauge STD 20 bar / 700 bar',
          manufacturer: 'Additel / Additel',
          serialNumber: '211H18830045 / 211H20070058',
          traceability: 'LK-176-IDN / LK-023-IDN',
        }),
      ],
      measurementTables: [{
        id: 'pressure',
        title: 'Data Pengukuran Tekanan',
        description: 'Isi penunjukan alat dan tiga rangkaian penunjukan standar pada arah naik dan turun.',
        rowCount: 18,
        initialRowCount: 1,
        templateRowCount: 18,
        minRows: 1,
        maxRows: 18,
        preserveTemplateRows: true,
        headerFieldKeys: ['instrumentIndicationUnit', 'standardIndicationUnit'],
        columns: [
          { key: 'instrumentIndication', label: 'Penunjukan Alat', inputType: 'number' },
          ...Array.from({ length: 3 }, (_, index) => ({
            label: `Penunjukan Standar ${index + 1}`,
            children: [
              { key: `standard${index + 1}Up`, label: 'Naik', inputType: 'number' as const },
              { key: `standard${index + 1}Down`, label: 'Turun', inputType: 'number' as const },
            ],
          })),
        ],
      }],
      cellMappings: {
        'instrument.name': ['C8'],
        'additionalFields.calibrationMethod': ['G9'],
        'additionalFields.additionalInformation': ['A15'],
        'additionalFields.standardIndicationUnit': ['C18'],
        'additionalFields.instrumentIndicationUnit': ['A19'],
        ...standardDataMappings(40),
        ...createGenericTableMappings('pressure', 21, 18, {
          instrumentIndication: 'A',
          standard1Up: 'C', standard1Down: 'D',
          standard2Up: 'E', standard2Down: 'F',
          standard3Up: 'G', standard3Down: 'H',
        }),
      },
    };
  }

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

const verifiedFieldLabels: NonNullable<InstrumentFormSeed['fieldLabels']> = {
  calibrationDate: 'Tanggal Kalibrasi',
  company: 'Nama Perusahaan',
  certificateNumber: 'No. Sertifikat',
  name: 'Nama Alat',
  manufacturer: 'Merk',
  model: 'Type/Model',
  serialNumber: 'No. Seri',
  identityNumber: 'No. Identitas',
  capacity: 'Kapasitas',
  capacityMin: 'Kapasitas Minimum',
  capacityMax: 'Kapasitas Maksimum',
  resolution: 'Resolusi',
  calibrationLocation: 'Lokasi Kalibrasi',
  ambientTemperatureStart: 'Temperature Ruang Awal',
  ambientTemperatureMiddle: 'Temperature Ruang Tengah',
  ambientTemperatureEnd: 'Temperature Ruang Akhir',
  ambientHumidityStart: 'Kelembaban Awal',
  ambientHumidityMiddle: 'Kelembaban Tengah',
  ambientHumidityEnd: 'Kelembaban Akhir',
};

const standardDataFields = (
  defaults: Partial<Record<'name' | 'manufacturer' | 'serialNumber' | 'traceability', string>> = {},
): NonNullable<InstrumentFormSeed['additionalFields']> => [
  { key: 'standardName', label: 'Standar yang digunakan', section: 'Data Standar', ...(defaults.name ? { defaultValue: defaults.name } : {}) },
  { key: 'standardManufacturer', label: 'Merk', section: 'Data Standar', ...(defaults.manufacturer ? { defaultValue: defaults.manufacturer } : {}) },
  { key: 'standardSerialNumber', label: 'No. Seri', section: 'Data Standar', ...(defaults.serialNumber ? { defaultValue: defaults.serialNumber } : {}) },
  { key: 'standardTraceability', label: 'Tertelusur ke SI', section: 'Data Standar', ...(defaults.traceability ? { defaultValue: defaults.traceability } : {}) },
  { key: 'standardUncertainty', label: 'Ketidakpastian', section: 'Data Standar' },
];

const standardDataMappings = (firstRow: number): Record<string, string[]> => ({
  'additionalFields.standardName': [`C${firstRow}`],
  'additionalFields.standardManufacturer': [`C${firstRow + 1}`],
  'additionalFields.standardSerialNumber': [`C${firstRow + 2}`],
  'additionalFields.standardTraceability': [`C${firstRow + 3}`],
  'additionalFields.standardUncertainty': [`C${firstRow + 4}`],
});

function createTimerStopwatchForm(): InstrumentFormSeed {
  const columns: MeasurementTableSeed['columns'] = [
    { label: 'Nominal', children: [{ key: 'nominalMinutes', label: 'Menit' }, { key: 'nominalSeconds', label: 'Detik' }] },
    ...Array.from({ length: 3 }, (_, index) => ({
      label: `Pengukuran ${index + 1}`,
      children: [{ key: `reading${index + 1}Minutes`, label: 'Menit' }, { key: `reading${index + 1}Seconds`, label: 'Detik' }],
    })),
  ];
  const table = (id: string, title: string): MeasurementTableSeed => ({
    id, title, rowCount: 6, initialRowCount: 1, templateRowCount: 6, minRows: 1, maxRows: 6,
    preserveTemplateRows: true, columns,
  });
  const mappingColumns = {
    nominalMinutes: 'A', nominalSeconds: 'B',
    reading1Minutes: 'C', reading1Seconds: 'D',
    reading2Minutes: 'E', reading2Seconds: 'F',
    reading3Minutes: 'G', reading3Seconds: 'H',
  };
  return {
    code: 'CCI-KAL-FOM-054', revision: '02', name: 'Timer / Stopwatch', sheet: 'Timer-Stopwatch 02', workbook: earlyWorkbookPath,
    mappingVerified: true, fieldLabels: verifiedFieldLabels,
    additionalFields: [
      { key: 'calibrationMethod', label: 'Metode Kalibrasi', defaultValue: 'CCI-KAL-WI-016' },
      ...standardDataFields(),
    ],
    measurementTables: [table('standard', 'Hasil Pengukuran Standar'), table('uut', 'Hasil Pengukuran Uji')],
    cellMappings: {
      'additionalFields.calibrationMethod': ['G9'],
      ...standardDataMappings(40),
      ...createGenericTableMappings('standard', 20, 6, mappingColumns),
      ...createGenericTableMappings('uut', 31, 6, mappingColumns),
    },
  };
}

function createVolumetricGlasswareForm(): InstrumentFormSeed {
  const labels = ['m₀₀', 'm₀', 'm₁', 'm₂', 'm₃', 'm₄', 'm₅', 'm₆'];
  const table = (id: string, title: string, includeDiameter = false): MeasurementTableSeed => ({
    id, title, rowCount: 8, initialRowCount: 8, templateRowCount: 8, minRows: 8, maxRows: 8,
    fixedRows: true, preserveTemplateRows: true, ...(includeDiameter ? { headerFieldKeys: ['innerDiameter'] } : {}),
    columns: [
      {
        label: 'Volume',
        children: [{
          label: 'Nominal',
          children: [
            { key: 'volume', label: 'ml', inputType: 'number', rowSpan: 8 },
            { key: 'measurement', label: 'Data', lockedValues: labels },
          ],
        }],
      },
      { label: 'W kosong', children: [{ label: 'R', children: [{ key: 'emptyWeight', label: 'g', inputType: 'number' }] }] },
      { label: 'W isi', children: [{ label: 'R’', children: [{ key: 'filledWeight', label: 'g', inputType: 'number' }] }] },
      {
        label: 'Massa Air',
        children: [{
          label: 'm = R’ − R',
          children: [{
            key: 'waterMass', label: 'g',
            calculation: { operator: 'subtract', minuendKey: 'filledWeight', subtrahendKey: 'emptyWeight' },
          }],
        }],
      },
      { label: 'Suhu Air', children: [{ label: 'tₐ', children: [{ key: 'waterTemperature', label: '°C', inputType: 'number' }] }] },
    ],
  });
  return {
    code: 'CCI-KAL-FOM-055', revision: '04', name: 'Volumetric Glassware', sheet: 'Volumetric Glassware 04', workbook: earlyWorkbookPath,
    mappingVerified: true,
    fieldLabels: { ...verifiedFieldLabels, serialNumber: 'No. Seri / No. Identitas' },
    omitFields: ['identityNumber'],
    additionalFields: [
      { key: 'calibrationMethod', label: 'Metode Kalibrasi', defaultValue: 'CCI-KAL-WI-' },
      { key: 'innerDiameter', label: 'Ukuran Diameter Dalam', exportPrefix: 'Ukuran Diameter Dalam : ', exportSuffix: ' cm' },
      ...standardDataFields(),
    ],
    measurementTables: [
      table('volume1', 'Data Volume 1', true),
      table('volume2', 'Data Volume 2'),
      table('volume3', 'Data Volume 3'),
    ],
    cellMappings: {
      'instrument.serialNumber': ['C11'],
      'environment.temperatureStart': ['H12'], 'environment.temperatureEnd': ['I12'],
      'environment.humidityStart': ['H13'], 'environment.humidityEnd': ['I13'],
      'additionalFields.calibrationMethod': ['H9'],
      'additionalFields.innerDiameter': ['A14'],
      ...standardDataMappings(45),
      ...createGenericTableMappings('volume1', 19, 8, { volume: 'A', measurement: 'B', emptyWeight: 'C', filledWeight: 'D', waterTemperature: 'F' }),
      ...createGenericTableMappings('volume2', 27, 8, { volume: 'A', measurement: 'B', emptyWeight: 'C', filledWeight: 'D', waterTemperature: 'F' }),
      ...createGenericTableMappings('volume3', 35, 8, { volume: 'A', measurement: 'B', emptyWeight: 'C', filledWeight: 'D', waterTemperature: 'F' }),
    },
  };
}

function createAutoclaveForm(): InstrumentFormSeed {
  return {
    code: 'CCI-KAL-FOM-056', revision: '04', name: 'Autoclave', sheet: 'Autoclave 04', workbook: earlyWorkbookPath,
    mappingVerified: true, fieldLabels: verifiedFieldLabels,
    additionalFields: [
      { key: 'calibrationMethod', label: 'Metode Kalibrasi', defaultValue: 'CCI-KAL-WI-020' },
      { key: 'pressureRange', label: 'Range Pressure', section: 'Data Pressure', exportPrefix: 'Range: ' },
      { key: 'pressureResolution', label: 'Resolusi Pressure', section: 'Data Pressure', exportPrefix: 'Resolusi: ' },
      { key: 'pressureNominalUnit', label: 'Satuan Nominal Pressure', section: 'Data Pressure', exportPrefix: '(', exportSuffix: ')' },
      { key: 'pressureUutUnit', label: 'Satuan Pembacaan UUT', section: 'Data Pressure', exportPrefix: '(', exportSuffix: ')' },
      { key: 'temperatureRange', label: 'Range Temperature', section: 'Data Temperature', exportPrefix: 'Range: ' },
      { key: 'temperatureResolution', label: 'Resolusi Temperature', section: 'Data Temperature', exportPrefix: 'Resolusi: ' },
    ],
    measurementTables: [
      {
        id: 'pressure', title: 'Data Pressure', rowCount: 5, initialRowCount: 1, templateRowCount: 5, minRows: 1, maxRows: 5,
        preserveTemplateRows: true, headerFieldKeys: ['pressureRange', 'pressureResolution', 'pressureNominalUnit', 'pressureUutUnit'],
        columns: [
          { key: 'nominal', label: 'Nominal' }, { key: 'uutReading', label: 'Pembacaan UUT' },
          { label: 'Waktu Logger', children: [1, 2, 3].map((n) => ({ key: `loggerTime${n}`, label: String(n) })) },
          { label: 'Standar Logger', children: [1, 2, 3].map((n) => ({ key: `standard${n}`, label: String(n) })) },
        ],
      },
      {
        id: 'temperature', title: 'Data Temperature', rowCount: 6, initialRowCount: 6, templateRowCount: 6, minRows: 6, maxRows: 6,
        fixedRows: true, preserveTemplateRows: true, headerFieldKeys: ['temperatureRange', 'temperatureResolution'],
        columns: [
          { key: 'repeat', label: 'Repeat', lockedValues: ['1', '2', '3', '1', '2', '3'] },
          { key: 'setPoint', label: 'Set Point UUT' },
          { label: 'Waktu Sterilisasi', children: [{ key: 'sterilizationStart', label: 'Awal' }, { key: 'sterilizationEnd', label: 'Akhir' }] },
          { key: 'loggerTime', label: 'Waktu Logger' },
          { label: 'Standar Logger (°C)', children: [{ key: 'bottom', label: 'Bawah' }, { key: 'middle', label: 'Tengah' }, { key: 'top', label: 'Atas' }] },
        ],
      },
    ],
    cellMappings: {
      'additionalFields.calibrationMethod': ['G9'],
      'additionalFields.pressureRange': ['A17'], 'additionalFields.pressureResolution': ['D17'],
      'additionalFields.pressureNominalUnit': ['A19'], 'additionalFields.pressureUutUnit': ['B19'],
      'additionalFields.temperatureRange': ['A28'], 'additionalFields.temperatureResolution': ['D28'],
      ...createGenericTableMappings('pressure', 20, 5, {
        nominal: 'A', uutReading: 'B', loggerTime1: 'C', loggerTime2: 'D', loggerTime3: 'E', standard1: 'F', standard2: 'G', standard3: 'H',
      }),
      ...createGenericTableMappings('temperature', 31, 6, {
        repeat: 'A', setPoint: 'B', sterilizationStart: 'C', sterilizationEnd: 'D', loggerTime: 'E', bottom: 'F', middle: 'G', top: 'H',
      }),
    },
  };
}

function createVerifiedMicrometerForm(variant: 'A' | 'B'): InstrumentFormSeed {
  const isFull = variant === 'B';
  const code = isFull ? 'CCI-KAL-FOM-057-B' : 'CCI-KAL-FOM-057';
  const traceability = isFull ? 'LK-032-IDN / LK-070-IDN' : 'LK-054-IDN / JCC (Taiwan)';
  const nominalRows = isFull ? 10 : 11;
  const additionalFields: NonNullable<InstrumentFormSeed['additionalFields']> = [
    { key: 'arrivalDate', label: 'Tanggal Alat Datang', inputType: 'date' },
    { key: 'calibrationMethod', label: 'Metode Kalibrasi', defaultValue: 'CCI-KAL-WI-012' },
    { key: 'resolution1', label: 'Resolusi 1' }, { key: 'resolution2', label: 'Resolusi 2' },
    { key: 'calibrationRange1', label: 'Rentang Kalibrasi 1' }, { key: 'calibrationRange2', label: 'Rentang Kalibrasi 2' },
    ...standardDataFields({
      name: 'Gauge Block Grade 0 / Grade K', manufacturer: 'Mitutoyo / Metrology',
      serialNumber: '2000149 / 220003', traceability,
    }).slice(0, 4),
    ...(isFull ? [
      { key: 'initialPositionTool', label: 'Identitas Pin Gauge / Gauge Block', section: 'Keterangan Tambahan' },
      { key: 'standardCondition', label: 'Kondisi Standar', section: 'Keterangan Tambahan', inputType: 'select' as const, options: ['Baik', 'Tidak Baik'] },
      { key: 'instrumentCondition', label: 'Kondisi Alat', section: 'Keterangan Tambahan', inputType: 'select' as const, options: ['Baik', 'Tidak Baik'] },
    ] : []),
  ];
  const nominal: MeasurementTableSeed = {
    id: 'nominal', title: 'Pengujian per Nominal', rowCount: nominalRows, initialRowCount: 1,
    templateRowCount: nominalRows, minRows: 1, maxRows: nominalRows, preserveTemplateRows: true,
    columns: fiveReadingColumns,
  };
  const tables: MeasurementTableSeed[] = isFull ? [
    {
      id: 'flatness', title: 'Pengujian Kerataan Muka Ukur',
      description: 'Menggunakan optical flat.',
      rowCount: 1, initialRowCount: 1, templateRowCount: 1, minRows: 1, maxRows: 1, fixedRows: true, preserveTemplateRows: true,
      columns: Array.from({ length: 3 }, (_, repeat) => ({
        label: `Ke-${repeat + 1}`,
        children: ['Anvil', 'Spindel'].map((face) => ({
          label: face,
          children: [{ key: `repeat${repeat + 1}${face}`, label: 'garis', inputType: 'number' as const, exportSuffix: ' garis' }],
        })),
      })),
    },
    {
      id: 'parallelism', title: 'Pengujian Keparalelan Muka Ukur',
      description: 'Menggunakan gauge block.',
      rowCount: 1, initialRowCount: 1, templateRowCount: 1, minRows: 1, maxRows: 1, fixedRows: true, preserveTemplateRows: true,
      columns: Array.from({ length: 5 }, (_, index) => ({
        label: `Posisi ${index + 1}`,
        children: [{ key: `position${index + 1}`, label: 'mm', inputType: 'number' as const, exportSuffix: ' mm' }],
      })),
    },
    nominal,
    {
      id: 'repeatability', title: 'Pengujian Keberulangan',
      description: 'Pilih satu titik ukur yang memiliki penyimpangan signifikan.',
      rowCount: 2, initialRowCount: 1, templateRowCount: 2, minRows: 1, maxRows: 2, preserveTemplateRows: true,
      columns: tenReadingColumns,
    },
  ] : [nominal];
  const mappings: Record<string, string[]> = {
    'additionalFields.arrivalDate': ['I9'], 'additionalFields.calibrationMethod': ['I14'],
    'additionalFields.standardName': ['I15'], 'additionalFields.standardManufacturer': ['I16'],
    'additionalFields.standardSerialNumber': ['I17'], 'additionalFields.standardTraceability': ['I18'],
    'additionalFields.resolution1': ['C15'], 'additionalFields.resolution2': ['C16'],
    'additionalFields.calibrationRange1': ['C17'], 'additionalFields.calibrationRange2': ['C18'],
    ...createGenericTableMappings('nominal', isFull ? 33 : 23, nominalRows, {
      nominal: 'A', reading1: 'C', reading2: 'E', reading3: 'G', reading4: 'I', reading5: 'K',
    }),
  };
  if (isFull) {
    Object.assign(mappings, {
      'additionalFields.initialPositionTool': ['K54'], 'additionalFields.standardCondition': ['K55'], 'additionalFields.instrumentCondition': ['K56'],
      ...createGenericTableMappings('flatness', 23, 1, {
        repeat1Anvil: 'A', repeat1Spindel: 'C', repeat2Anvil: 'E', repeat2Spindel: 'G', repeat3Anvil: 'I', repeat3Spindel: 'K',
      }),
      ...createGenericTableMappings('parallelism', 27, 1, {
        position1: 'A', position2: 'C', position3: 'E', position4: 'G', position5: 'J',
      }),
      ...createGenericTableMappings('repeatability', 49, 2, {
        nominal: 'A', reading1: 'C', reading2: 'D', reading3: 'E', reading4: 'F', reading5: 'G',
        reading6: 'H', reading7: 'I', reading8: 'J', reading9: 'K', reading10: 'L',
      }),
    });
  }
  return {
    code, revision: '03', name: `Mikrometer — ${traceability}`, sheet: isFull ? 'Mikrometer-03' : 'Mikrometer 03',
    workbook: earlyWorkbookPath, mappingVerified: true, identityMappingKey: code,
    fieldLabels: verifiedFieldLabels, additionalFields, measurementTables: tables, cellMappings: mappings,
  };
}

function createEarlyDimensionalInstrumentForm(
  code: string,
  name: string,
  sheet: string,
  nominalFirstRow: number,
  repeatabilityFirstRow: number,
  revision?: string,
): InstrumentFormSeed {
  return {
    code, name, sheet, workbook: earlyWorkbookPath, ...(revision ? { revision } : {}),
    measurementTables: [
      { id: 'nominal', title: 'A. Pengujian per Nominal', rowCount: 1, columns: fiveReadingColumns },
      { id: 'repeatability', title: 'B. Pengujian Keberulangan', rowCount: 1, columns: tenReadingColumns },
    ],
    cellMappings: {
      ...createGenericTableMappings('nominal', nominalFirstRow, 2, { nominal: 'B', reading1: 'C', reading2: 'D', reading3: 'E', reading4: 'F', reading5: 'G' }),
      ...createGenericTableMappings('repeatability', repeatabilityFirstRow, 2, { nominal: 'B', reading1: 'C', reading2: 'D', reading3: 'E', reading4: 'F', reading5: 'G', reading6: 'H', reading7: 'I', reading8: 'J', reading9: 'K', reading10: 'L' }),
    },
  };
}

function createFixedMeasurementTable(
  id: string,
  title: string,
  rowCount: number,
  columns: MeasurementTableSeed['columns'],
  headerFieldKeys: string[],
): MeasurementTableSeed {
  return {
    id,
    title,
    rowCount,
    initialRowCount: rowCount,
    templateRowCount: rowCount,
    minRows: rowCount,
    maxRows: rowCount,
    fixedRows: true,
    preserveTemplateRows: true,
    headerFieldKeys,
    columns,
  };
}

function createScaleForm(revision: '04' | '05'): InstrumentFormSeed {
  const isRevision05 = revision === '05';
  const rowOffset = isRevision05 ? 0 : -3;
  const identityOffset = isRevision05 ? 0 : -1;
  const initialRow = 21 + rowOffset;
  const repeatabilityRow = 26 + rowOffset;
  const resultRow = 40 + rowOffset;
  const repeatabilityNumbers = Array.from({ length: 10 }, (_, index) => String(index + 1));
  const eccentricityPositions = Array.from({ length: 5 }, (_, index) => String(index + 1));

  return {
    code: 'CCI-KAL-FOM-028',
    revision,
    name: 'Timbangan',
    sheet: isRevision05 ? 'Timbangan 05' : 'TImbangan 04',
    workbook: earlyWorkbookPath,
    ...(isRevision05 ? {} : { identityMappingKey: 'CCI-KAL-FOM-028-B' }),
    mappingVerified: true,
    fieldLabels: {
      calibrationDate: 'Tanggal Kalibrasi',
      company: 'Nama Perusahaan',
      certificateNumber: 'No. Sertifikat',
      name: 'Nama Alat',
      manufacturer: 'Merk',
      model: 'Type/Model',
      serialNumber: 'No. Seri',
      identityNumber: 'No. Identitas',
      capacity: 'Kapasitas',
      resolution: 'Resolusi',
      calibrationLocation: 'Lokasi Kalibrasi',
      ambientTemperatureStart: 'Temperature Ruang Awal',
      ambientTemperatureEnd: 'Temperature Ruang Akhir',
      ambientHumidityStart: 'Kelembaban Awal',
      ambientHumidityEnd: 'Kelembaban Akhir',
    },
    cellValueFormats: {
      'environment.temperatureStart': {},
      'environment.temperatureEnd': {},
      'environment.humidityStart': {},
      'environment.humidityEnd': {},
    },
    additionalFields: [
      { key: 'calibrationMethod', label: 'Metode Kalibrasi', defaultValue: 'CCI-KAL-WI-003' },
      { key: 'capacityUnit', label: 'Satuan Kapasitas', placeholder: 'Contoh: kg', exportPrefix: '(', exportSuffix: ')' },
      { key: 'resolutionUnit', label: 'Satuan Resolusi', placeholder: 'Contoh: g', exportPrefix: '(', exportSuffix: ')' },
      ...(isRevision05 ? [{ key: 'preAdjustmentCheck', label: 'Pre-adjustment check', inputType: 'select' as const, options: ['Ya', 'Tidak'] }] : []),
      { key: 'initialNominalUnit', label: 'Satuan Nominal', exportPrefix: 'Nominal (', exportSuffix: ')' },
      { key: 'initialReadingUnit', label: 'Satuan Pembacaan Alat', exportPrefix: 'Pembacaan Alat (', exportSuffix: ')' },
      { key: 'repeatabilityHalfNominal', label: 'Nominal pada ½ kapasitas maksimum', exportPrefix: '1.1 Repeatability pada ½ kapasitas maksimum timbangan (', exportSuffix: ')' },
      { key: 'repeatabilityHalfZiUnit', label: 'Satuan zᵢ', exportPrefix: 'zᵢ (', exportSuffix: ')' },
      { key: 'repeatabilityHalfMiUnit', label: 'Satuan mᵢ', exportPrefix: 'mᵢ (', exportSuffix: ')' },
      { key: 'repeatabilityMaxNominal', label: 'Nominal pada kapasitas maksimum', exportPrefix: '1.2 Repeatability pada kapasitas maksimum timbangan (', exportSuffix: ')' },
      { key: 'repeatabilityMaxZiUnit', label: 'Satuan zᵢ', exportPrefix: 'zᵢ (', exportSuffix: ')' },
      { key: 'repeatabilityMaxMiUnit', label: 'Satuan mᵢ', exportPrefix: 'mᵢ (', exportSuffix: ')' },
      { key: 'correctionNominalUnit', label: 'Satuan Nominal Koreksi', exportPrefix: 'Nominal (', exportSuffix: ')' },
      { key: 'correctionReadingUnit', label: 'Satuan Pembacaan Alat Koreksi', exportPrefix: 'Pembacaan Alat (', exportSuffix: ')' },
      { key: 'eccentricityNominalUnit', label: 'Satuan Nominal Eksentrisitas', exportPrefix: 'Nominal (', exportSuffix: ')' },
      { key: 'eccentricityReadingUnit', label: 'Satuan Pembacaan Alat Eksentrisitas', exportPrefix: 'Pembacaan Alat (', exportSuffix: ')' },
    ],
    measurementTables: [
      createFixedMeasurementTable(
        'initialCheck',
        'Pembacaan Awal (Pre-adjustment Check)',
        1,
        [
          { key: 'nominal', label: 'Nominal', inputType: 'number' },
          { key: 'z1', label: 'z₁', inputType: 'number' },
          { key: 'm1', label: 'm₁', inputType: 'number' },
          { key: 'm2', label: 'm₂', inputType: 'number' },
          { key: 'z2', label: 'z₂', inputType: 'number' },
        ],
        [...(isRevision05 ? ['preAdjustmentCheck'] : []), 'initialNominalUnit', 'initialReadingUnit'],
      ),
      createFixedMeasurementTable(
        'repeatabilityHalf',
        '1.1 Repeatability pada ½ Kapasitas Maksimum Timbangan',
        10,
        [
          { key: 'readingNumber', label: 'Pembacaan ke-', lockedValues: repeatabilityNumbers },
          { key: 'zi', label: 'zᵢ', inputType: 'number' },
          { key: 'mi', label: 'mᵢ', inputType: 'number' },
          { key: 'standardIdentification', label: 'Identifikasi Standar' },
        ],
        ['repeatabilityHalfNominal', 'repeatabilityHalfZiUnit', 'repeatabilityHalfMiUnit'],
      ),
      createFixedMeasurementTable(
        'repeatabilityMax',
        '1.2 Repeatability pada Kapasitas Maksimum Timbangan',
        10,
        [
          { key: 'readingNumber', label: 'Pembacaan ke-', lockedValues: repeatabilityNumbers },
          { key: 'zi', label: 'zᵢ', inputType: 'number' },
          { key: 'mi', label: 'mᵢ', inputType: 'number' },
          { key: 'standardIdentification', label: 'Identifikasi Standar' },
        ],
        ['repeatabilityMaxNominal', 'repeatabilityMaxZiUnit', 'repeatabilityMaxMiUnit'],
      ),
      createFixedMeasurementTable(
        'correction',
        '2. Menentukan Koreksi Timbangan',
        12,
        [
          { key: 'nominal', label: 'Nominal', inputType: 'number' },
          { key: 'z1', label: 'z₁', inputType: 'number' },
          { key: 'm1', label: 'm₁', inputType: 'number' },
          { key: 'm2', label: 'm₂', inputType: 'number' },
          { key: 'z2', label: 'z₂', inputType: 'number' },
          { key: 'standardIdentification', label: 'Identifikasi Standar' },
        ],
        ['correctionNominalUnit', 'correctionReadingUnit'],
      ),
      createFixedMeasurementTable(
        'eccentricity',
        '3. Menentukan Eksentrisitas',
        5,
        [
          { key: 'position', label: 'Posisi', lockedValues: eccentricityPositions },
          { key: 'reading', label: 'Pembacaan Alat', inputType: 'number' },
        ],
        ['eccentricityNominalUnit', 'eccentricityReadingUnit'],
      ),
    ],
    conditionalCellMappings: isRevision05 ? [
      { dataPath: 'additionalFields.preAdjustmentCheck', target: 'E17', valueMap: { Ya: '☒ Ya', Tidak: '☐ Ya' } },
      { dataPath: 'additionalFields.preAdjustmentCheck', target: 'G17', valueMap: { Ya: '☐ Tidak', Tidak: '☒ Tidak' } },
    ] : [],
    cellMappings: {
      certificateNumber: [`C${7 + identityOffset}`],
      calibrationDate: [`H${7 + identityOffset}`],
      'instrument.name': [`C${8 + identityOffset}`],
      calibrationLocation: [`H${8 + identityOffset}`],
      'instrument.manufacturer': [`C${9 + identityOffset}`],
      'additionalFields.calibrationMethod': [`H${9 + identityOffset}`],
      'instrument.model': [`C${10 + identityOffset}`],
      'company.name': [`H${10 + identityOffset}`],
      'instrument.serialNumber': [`C${11 + identityOffset}`],
      'instrument.identityNumber': [`C${12 + identityOffset}`],
      'instrument.capacity': [`C${13 + identityOffset}`],
      'additionalFields.capacityUnit': [`E${13 + identityOffset}`],
      'environment.temperatureStart': [`H${13 + identityOffset}`],
      'environment.temperatureEnd': [`I${13 + identityOffset}`],
      'instrument.resolution': [`C${14 + identityOffset}`],
      'additionalFields.resolutionUnit': [`E${14 + identityOffset}`],
      'environment.humidityStart': [`H${14 + identityOffset}`],
      'environment.humidityEnd': [`I${14 + identityOffset}`],
      'additionalFields.initialNominalUnit': [`A${19 + rowOffset}`],
      'additionalFields.initialReadingUnit': [`C${19 + rowOffset}`],
      'additionalFields.repeatabilityHalfNominal': [`A${24 + rowOffset}`],
      'additionalFields.repeatabilityHalfZiUnit': [`B${25 + rowOffset}`],
      'additionalFields.repeatabilityHalfMiUnit': [`C${25 + rowOffset}`],
      'additionalFields.repeatabilityMaxNominal': [`G${24 + rowOffset}`],
      'additionalFields.repeatabilityMaxZiUnit': [`H${25 + rowOffset}`],
      'additionalFields.repeatabilityMaxMiUnit': [`I${25 + rowOffset}`],
      'additionalFields.correctionNominalUnit': [`A${38 + rowOffset}`],
      'additionalFields.correctionReadingUnit': [`B${38 + rowOffset}`],
      'additionalFields.eccentricityNominalUnit': [`H${38 + rowOffset}`],
      'additionalFields.eccentricityReadingUnit': [`J${38 + rowOffset}`],
      ...createGenericTableMappings('initialCheck', initialRow, 1, { nominal: 'A', z1: 'C', m1: 'E', m2: 'G', z2: 'I' }),
      ...createGenericTableMappings('repeatabilityHalf', repeatabilityRow, 10, { readingNumber: 'A', zi: 'B', mi: 'C', standardIdentification: 'E' }),
      ...createGenericTableMappings('repeatabilityMax', repeatabilityRow, 10, { readingNumber: 'G', zi: 'H', mi: 'I', standardIdentification: 'K' }),
      ...createGenericTableMappings('correction', resultRow, 12, { nominal: 'A', z1: 'B', m1: 'C', m2: 'D', z2: 'E', standardIdentification: 'F' }),
      ...createGenericTableMappings('eccentricity', resultRow, 5, { position: 'H', reading: 'J' }),
    },
  };
}

export const instrumentForms: InstrumentFormSeed[] = [
  {
    code: 'CCI-KAL-FOM-0XX', revision: '02', name: 'Lembar Kerja Umum', sheet: 'Lembar Kerja Umum', workbook: earlyWorkbookPath,
    mappingVerified: true,
    instrumentNameDefault: '',
    fieldLabels: {
      calibrationDate: 'Tanggal Uji',
      company: 'Nama Pemilik/Perusahaan',
      certificateNumber: 'No. Sertifikat',
      name: 'Nama Alat/Bahan',
      manufacturer: 'Merk',
      model: 'Type / Model / Kode',
      serialNumber: 'No. Seri / No. Lot / Batch',
      identityNumber: 'Identitas',
      capacity: 'Kapasitas',
      resolution: 'Resolusi',
      calibrationLocation: 'Lokasi Uji',
      ambientTemperatureStart: 'Suhu Ruangan Awal',
      ambientTemperatureEnd: 'Suhu Ruangan Akhir',
      ambientHumidityStart: 'Kelembapan Ruangan Awal',
      ambientHumidityEnd: 'Kelembapan Ruangan Akhir',
    },
    additionalFields: [
      { key: 'testMethod', label: 'Metode Uji', defaultValue: 'CCI-KAL-WI-037' },
      { key: 'additionalInformation', label: 'Keterangan Tambahan' },
      { key: 'capacityUnit', label: 'Satuan Kapasitas', placeholder: 'Contoh: kg', exportPrefix: '(', exportSuffix: ')' },
      { key: 'resolutionUnit', label: 'Satuan Resolusi', placeholder: 'Contoh: g', exportPrefix: '(', exportSuffix: ')' },
      { key: 'standardName', label: 'Standar yang digunakan', section: 'Data Standar' },
      { key: 'standardManufacturer', label: 'Merk', section: 'Data Standar' },
      { key: 'standardSerialNumber', label: 'No. Seri / No. Lot', section: 'Data Standar' },
      { key: 'standardTraceability', label: 'Tertelusur ke SI', section: 'Data Standar' },
      { key: 'standardUncertainty', label: 'Ketidakpastian', section: 'Data Standar' },
    ],
    measurementTables: [{
      id: 'measurements',
      title: 'Titik/Parameter Ukur/Uji',
      description: 'Isi parameter pengujian, lima penunjukan alat/bahan UUT, dan lima penunjukan standar untuk setiap baris.',
      rowCount: 14,
      initialRowCount: 1,
      templateRowCount: 14,
      minRows: 1,
      maxRows: 14,
      layout: 'record-grid',
      preserveTemplateRows: true,
      columns: [
        { key: 'parameter', label: 'Titik/Parameter Ukur/Uji', inputType: 'text' },
        {
          label: 'Penunjukan Alat/Bahan UUT',
          children: Array.from({ length: 5 }, (_, index) => ({ key: `uut${index + 1}`, label: String(index + 1), inputType: 'number' as const })),
        },
        {
          label: 'Penunjukan Standar STD',
          children: Array.from({ length: 5 }, (_, index) => ({ key: `standard${index + 1}`, label: String(index + 1), inputType: 'number' as const })),
        },
      ],
    }],
    cellMappings: {
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
      'additionalFields.standardManufacturer': ['C35'],
      'additionalFields.standardSerialNumber': ['C36'],
      'additionalFields.standardTraceability': ['C37'],
      'additionalFields.standardUncertainty': ['C38'],
      ...createGenericTableMappings('measurements', 18, 14, {
        parameter: 'A',
        uut1: 'C', uut2: 'D', uut3: 'E', uut4: 'F', uut5: 'G',
        standard1: 'H', standard2: 'I', standard3: 'J', standard4: 'K', standard5: 'L',
      }),
    },
  },
  createPressureGaugeForm('CCI-KAL-FOM-010', 'Pressure Gauge', 'Pressure Gauge', earlyWorkbookPath),
  {
    code: 'CCI-KAL-FOM-027', revision: '04', name: 'Anak Timbangan', sheet: ' Anak Timbangan 04', workbook: earlyWorkbookPath,
    mappingVerified: true,
    fieldLabels: {
      calibrationDate: 'Tanggal Kalibrasi',
      company: 'Nama Pemilik/Perusahaan',
      certificateNumber: 'No. Sertifikat',
      name: 'Nama Alat',
      manufacturer: 'Merk',
      model: 'Tipe Model',
      serialNumber: 'No. Seri',
      identityNumber: 'No. Identitas',
      capacity: 'Kapasitas (gram)',
      resolution: 'Resolusi (gram)',
      calibrationLocation: 'Lokasi Kalibrasi',
      ambientTemperatureStart: 'Temperature Ruang Awal',
      ambientTemperatureEnd: 'Temperature Ruang Akhir',
      ambientHumidityStart: 'Kelembaban Ruang Awal',
      ambientHumidityEnd: 'Kelembaban Ruang Akhir',
    },
    cellValueFormats: {
      'instrument.capacity': { suffix: ' gram' },
      'instrument.resolution': { suffix: ' gram' },
      'environment.temperatureStart': {},
      'environment.temperatureEnd': {},
      'environment.humidityStart': {},
      'environment.humidityEnd': {},
    },
    additionalFields: [
      { key: 'calibrationMethod', label: 'Metode Kalibrasi', defaultValue: 'CCI-KAL-WI-002' },
      { key: 'instrumentClass', label: 'Kelas' },
      { key: 'calibratorName', label: 'Nama', section: 'Kalibrator yang digunakan' },
      { key: 'calibratorManufacturer', label: 'Merk', section: 'Kalibrator yang digunakan' },
      { key: 'calibratorSerialNumber', label: 'No. Seri', section: 'Kalibrator yang digunakan' },
      { key: 'calibratorTraceability', label: 'Tertelusur ke SI', section: 'Kalibrator yang digunakan' },
      { key: 'calibratorUncertainty', label: 'Ketidakpastian', section: 'Kalibrator yang digunakan' },
    ],
    measurementTables: [
      createSixRowWeightTable('calibration1', '1A. Data Kalibrasi Anak Timbangan — Tabel 1', weightCalibrationColumns),
      createSixRowWeightTable('calibration2', '1B. Data Kalibrasi Anak Timbangan — Tabel 2', weightCalibrationColumns),
      createSixRowWeightTable('calibration3', '1C. Data Kalibrasi Anak Timbangan — Tabel 3', weightCalibrationColumns),
      createSixRowWeightTable('sensitivity1', '2A. Data Sensitivitas Anak Timbangan — Tabel 1', weightSensitivityColumns),
      createSixRowWeightTable('sensitivity2', '2B. Data Sensitivitas Anak Timbangan — Tabel 2', weightSensitivityColumns),
      createSixRowWeightTable('sensitivity3', '2C. Data Sensitivitas Anak Timbangan — Tabel 3', weightSensitivityColumns),
    ],
    cellMappings: {
      'instrument.resolution': ['C14'],
      'company.name': ['I9'],
      'environment.humidityStart': ['I14'],
      'environment.humidityEnd': ['K14'],
      'additionalFields.calibrationMethod': ['I8'],
      'additionalFields.instrumentClass': ['C12'],
      'additionalFields.calibratorName': ['A45'],
      'additionalFields.calibratorManufacturer': ['D45'],
      'additionalFields.calibratorSerialNumber': ['G45'],
      'additionalFields.calibratorTraceability': ['I45'],
      'additionalFields.calibratorUncertainty': ['K45'],
      ...createGenericTableMappings('calibration1', 18, 6, { nominal: 'B', s1: 'C', t1: 'D', t2: 'E', s2: 'F' }),
      ...createGenericTableMappings('calibration2', 26, 6, { nominal: 'B', s1: 'C', t1: 'D', t2: 'E', s2: 'F' }),
      ...createGenericTableMappings('calibration3', 34, 6, { nominal: 'B', s1: 'C', t1: 'D', t2: 'E', s2: 'F' }),
      ...createGenericTableMappings('sensitivity1', 18, 6, { nominalSensitivity: 'H', standard: 'I', test: 'J', testPlusSensitivity: 'K', standardPlusSensitivity: 'L' }),
      ...createGenericTableMappings('sensitivity2', 26, 6, { nominalSensitivity: 'H', standard: 'I', test: 'J', testPlusSensitivity: 'K', standardPlusSensitivity: 'L' }),
      ...createGenericTableMappings('sensitivity3', 34, 6, { nominalSensitivity: 'H', standard: 'I', test: 'J', testPlusSensitivity: 'K', standardPlusSensitivity: 'L' }),
    },
  },
  createScaleForm('05'),
  createScaleForm('04'),
  {
    code: 'CCI-KAL-FOM-033', name: 'Enklosur', sheet: 'Enklosur 03', workbook: earlyWorkbookPath,
    mappingVerified: true,
    additionalFields: [
      { key: 'calibrationMethod', label: 'Metode Kalibrasi' },
      { key: 'additionalInformation', label: 'Keterangan Tambahan' },
      { key: 'enclosureLength', label: 'Panjang (P)', section: 'Volume Enklosur', exportPrefix: 'P = ', exportSuffix: ' cm' },
      { key: 'enclosureWidth', label: 'Lebar (L)', section: 'Volume Enklosur', exportPrefix: 'L = ', exportSuffix: ' cm' },
      { key: 'enclosureHeight', label: 'Tinggi (T)', section: 'Volume Enklosur', exportPrefix: 'T = ', exportSuffix: ' cm' },
      { key: 'temperatureSetting', label: 'Setting (°C)' },
      { key: 'standardName', label: 'Standar yang digunakan', section: 'Data Standar' },
      { key: 'standardManufacturer', label: 'Merk', section: 'Data Standar' },
      { key: 'standardSerialNumber', label: 'No. Seri', section: 'Data Standar' },
      { key: 'standardTraceability', label: 'Tertelusur ke SI', section: 'Data Standar' },
      { key: 'standardUncertainty', label: 'Ketidakpastian', section: 'Data Standar' },
    ],
    measurementTables: [{
      id: 'enclosure',
      title: 'Data Pengukuran Distribusi Suhu Enklosur',
      description: 'Setting diisi satu kali untuk seluruh pengukuran. Tambahkan data indikator sesuai kebutuhan, maksimal 30 baris mengikuti template asli.',
      rowCount: 30,
      initialRowCount: 1,
      templateRowCount: 30,
      minRows: 1,
      maxRows: 30,
      preserveTemplateRows: true,
      headerFieldKeys: ['temperatureSetting'],
      columns: [
        { key: 'indicator', label: 'Indikator', unit: '°C', inputType: 'number' },
        { key: 'dataNumber', label: 'Data', lockedValues: Array.from({ length: 30 }, (_, index) => String(index + 1)) },
        {
          label: 'Penunjukan Standard (°C)',
          children: [
            { key: 'tu1', label: 'TU 1', inputType: 'number' }, { key: 'tu2', label: 'TU 2', inputType: 'number' },
            { key: 'tu3', label: 'TU 3', inputType: 'number' }, { key: 'tu4', label: 'TU 4', inputType: 'number' },
            { key: 'tu5', label: 'TU 5', inputType: 'number' }, { key: 'tu6', label: 'TU 6', inputType: 'number' },
            { key: 'tu7', label: 'TU 7', inputType: 'number' }, { key: 'tu8', label: 'TU 8', inputType: 'number' },
            { key: 'tu9', label: 'TU 9', inputType: 'number' },
          ],
        },
      ],
    }],
    cellMappings: {
      'additionalFields.calibrationMethod': ['I9'],
      'additionalFields.additionalInformation': ['I11'],
      'additionalFields.enclosureLength': ['C16'],
      'additionalFields.enclosureWidth': ['E16'],
      'additionalFields.enclosureHeight': ['G16'],
      'additionalFields.temperatureSetting': ['A21'],
      'additionalFields.standardName': ['C53'],
      'additionalFields.standardManufacturer': ['C54'],
      'additionalFields.standardSerialNumber': ['C55'],
      'additionalFields.standardTraceability': ['C56'],
      'additionalFields.standardUncertainty': ['C57'],
      ...createGenericTableMappings('enclosure', 21, 30, {
        dataNumber: 'C', indicator: 'B', tu1: 'D', tu2: 'E', tu3: 'F', tu4: 'G', tu5: 'H', tu6: 'I', tu7: 'J', tu8: 'K', tu9: 'L',
      }),
    },
  },
  {
    code: 'CCI-KAL-FOM-053', revision: '04', name: 'Thermohygrometer', sheet: 'Thermohygrometer 04', workbook: earlyWorkbookPath,
    mappingVerified: true,
    fieldLabels: {
      calibrationDate: 'Tanggal Kalibrasi',
      company: 'Nama Perusahaan',
      certificateNumber: 'No. Sertifikat',
      name: 'Nama Alat',
      manufacturer: 'Merek',
      model: 'Type/Model',
      serialNumber: 'No. Seri',
      identityNumber: 'Identitas',
      capacity: 'Kapasitas',
      resolution: 'Resolusi',
      calibrationLocation: 'Lokasi Kalibrasi',
      ambientTemperatureStart: 'Temperature Ruang Awal',
      ambientTemperatureEnd: 'Temperature Ruang Akhir',
      ambientHumidityStart: 'Kelembaban Awal',
      ambientHumidityEnd: 'Kelembaban Akhir',
    },
    additionalFields: [
      { key: 'calibrationMethod', label: 'Metode Kalibrasi', defaultValue: 'CCI-KAL-WI-008' },
      { key: 'additionalInformation', label: 'Keterangan Tambahan', defaultValue: 'IN / OUT' },
      { key: 'operatingHumidity', label: 'Kelembaban Operasional', section: 'Kondisi Operasional', exportPrefix: 'Kelembaban Operasional : ', exportSuffix: ' %RH' },
      { key: 'operatingTemperature', label: 'Suhu Operasional', section: 'Kondisi Operasional', exportPrefix: 'Suhu Operasional : ', exportSuffix: ' °C' },
      { key: 'standardName', label: 'Standar yang digunakan', section: 'Data Standar', defaultValue: 'Climatic Chamber, Thermohygrometer' },
      { key: 'standardManufacturer', label: 'Merk', section: 'Data Standar', defaultValue: 'Dahometer, Huato' },
      { key: 'standardSerialNumber', label: 'No. Seri', section: 'Data Standar' },
      { key: 'standardTraceability', label: 'Tertelusur ke SI', section: 'Data Standar' },
      { key: 'standardUncertainty', label: 'Ketidakpastian', section: 'Data Standar' },
    ],
    measurementTables: [
      {
        id: 'temperature',
        title: 'Data Suhu',
        description: 'Isi setting suhu serta lima pembacaan standar dan alat pada setiap titik.',
        rowCount: 10,
        initialRowCount: 1,
        templateRowCount: 10,
        minRows: 1,
        maxRows: 10,
        preserveTemplateRows: true,
        columns: [
          { key: 'setting', label: 'Setting Suhu', inputType: 'number' },
          {
            label: 'Pembacaan Standar (STD)',
            children: Array.from({ length: 5 }, (_, index) => ({ key: `standard${index + 1}`, label: String(index + 1), inputType: 'number' as const })),
          },
          {
            label: 'Pembacaan Alat (UUT)',
            children: Array.from({ length: 5 }, (_, index) => ({ key: `uut${index + 1}`, label: String(index + 1), inputType: 'number' as const })),
          },
        ],
      },
      {
        id: 'humidity',
        title: 'Data Kelembaban',
        description: 'Isi setting RH serta lima pembacaan standar dan alat pada setiap titik.',
        rowCount: 9,
        initialRowCount: 1,
        templateRowCount: 9,
        minRows: 1,
        maxRows: 9,
        preserveTemplateRows: true,
        columns: [
          { key: 'setting', label: 'Setting RH', inputType: 'number' },
          {
            label: 'Pembacaan Standar (STD)',
            children: Array.from({ length: 5 }, (_, index) => ({ key: `standard${index + 1}`, label: String(index + 1), inputType: 'number' as const })),
          },
          {
            label: 'Pembacaan Alat (UUT)',
            children: Array.from({ length: 5 }, (_, index) => ({ key: `uut${index + 1}`, label: String(index + 1), inputType: 'number' as const })),
          },
        ],
      },
    ],
    cellMappings: {
      'additionalFields.calibrationMethod': ['I9'],
      'additionalFields.additionalInformation': ['I11'],
      'additionalFields.operatingHumidity': ['A29'],
      'additionalFields.operatingTemperature': ['A43'],
      'additionalFields.standardName': ['C45'],
      'additionalFields.standardManufacturer': ['C46'],
      'additionalFields.standardSerialNumber': ['C47'],
      'additionalFields.standardTraceability': ['C48'],
      'additionalFields.standardUncertainty': ['C49'],
      ...createGenericTableMappings('temperature', 19, 10, {
        setting: 'A',
        standard1: 'B', standard2: 'C', standard3: 'D', standard4: 'E', standard5: 'F',
        uut1: 'G', uut2: 'H', uut3: 'I', uut4: 'J', uut5: 'K',
      }),
      ...createGenericTableMappings('humidity', 34, 9, {
        setting: 'A',
        standard1: 'B', standard2: 'C', standard3: 'D', standard4: 'E', standard5: 'F',
        uut1: 'G', uut2: 'H', uut3: 'I', uut4: 'J', uut5: 'K',
      }),
    },
  },
  createTimerStopwatchForm(),
  createVolumetricGlasswareForm(),
  createAutoclaveForm(),
  createVerifiedMicrometerForm('A'),
  createVerifiedMicrometerForm('B'),
  createPressureGaugeForm('CCI-KAL-FOM-058', 'Digital Pressure (FOM-058)', 'Digital Pressure', earlyWorkbookPath),
  createStandardVsUutForm('CCI-KAL-FOM-059', 'Thermometer Digital', 'Thermometer Digital', 18, 5),
  createStandardVsUutForm('CCI-KAL-FOM-060', 'Refractometer', 'Refractometer 03', 18, 5),
  createStandardVsUutForm('CCI-KAL-FOM-061', 'Centrifuge (Timer)', 'Centrifuge (Timer) 02', 18, 5),
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
  {
    code: 'CCI-KAL-FOM-109', name: 'Timbangan Jembatan', sheet: 'Timbangan Jembatan', workbook: currentWorkbookPath, omitFields: ['identityNumber'],
    measurementTables: [
      {
        id: 'eccentricity', title: 'A. Pengujian Pembebanan Tidak Terpusat (Eksentrisitas)', rowCount: 1,
        columns: [{ key: 'position', label: 'Posisi Beban' }, { key: 'zi', label: 'zi (Tanpa Beban)' }, { key: 'mi', label: 'mi (Dengan Beban)' }],
      },
      {
        id: 'repeatability', title: 'B. Pengujian Keberulangan Pembacaan', rowCount: 1,
        columns: [
          { key: 'load', label: 'Beban Nominal' },
          { key: 'reading1', label: '1' }, { key: 'reading2', label: '2' }, { key: 'reading3', label: '3' },
          { key: 'reading4', label: '4' }, { key: 'reading5', label: '5' },
        ],
      },
    ],
    cellMappings: {
      ...createGenericTableMappings('eccentricity', 20, 5, { position: 'A', zi: 'B', mi: 'C' }),
      ...createGenericTableMappings('repeatability', 33, 5, { load: 'B', reading1: 'C', reading2: 'D', reading3: 'E', reading4: 'F', reading5: 'G' }),
    },
  },
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
    mappingVerified: true,
    measurementTables: [
      { id: 'clockwise', title: 'Clockwise', rowCount: 10, initialRowCount: 10, templateRowCount: 10, minRows: 10, maxRows: 10, fixedRows: true, columns: [
        { key: 'indication', label: 'Penunjukan Alat' },
        ...Array.from({ length: 5 }, (_, index) => ({ key: `reading${index + 1}`, label: `Standar ${index + 1}` })),
      ] },
      { id: 'counterClockwise', title: 'Counter Clockwise', rowCount: 11, initialRowCount: 11, templateRowCount: 11, minRows: 11, maxRows: 11, fixedRows: true, columns: [
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
    mappingVerified: true,
    measurementTables: [{
      id: 'dissolvedOxygen', title: 'Data Pengukuran Dissolved Oxygen Meter', rowCount: 4,
      initialRowCount: 4, templateRowCount: 4, minRows: 4, maxRows: 4, fixedRows: true,
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
