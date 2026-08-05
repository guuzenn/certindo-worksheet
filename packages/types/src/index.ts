export const userRoles = ['ADMIN', 'TECHNICIAN', 'REVIEWER', 'APPROVER'] as const;
export type UserRole = (typeof userRoles)[number];

export const calibrationStatuses = [
  'DRAFT',
  'UNDER_REVIEW',
  'CONFIRMED',
  'POSTPONED',
  'COMPLETED',
] as const;
export type CalibrationStatus = (typeof calibrationStatuses)[number];

export const instrumentFieldKeys = [
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
export type InstrumentFieldKey = (typeof instrumentFieldKeys)[number];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export interface CalibrationFormData {
  calibrationDate: string;
  calibrationLocation: string;
  instrument: {
    name: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    identityNumber: string;
    capacity: string;
    capacityMin: string;
    capacityMax: string;
    resolution: string;
  };
  environment: {
    temperatureStart: string;
    temperatureMiddle: string;
    temperatureEnd: string;
    humidityStart: string;
    humidityMiddle: string;
    humidityEnd: string;
  };
  measurements: {
    clockwise: TorqueMeasurementRow[];
    counterClockwise: TorqueMeasurementRow[];
    dissolvedOxygen: DissolvedOxygenMeasurementRow[];
    tables: Record<string, Array<Record<string, string>>>;
  };
  additionalFields: Record<string, string>;
  notes: string;
}

export interface TorqueMeasurementRow {
  indication: string;
  readings: string[];
}

export interface DissolvedOxygenMeasurementRow {
  number: string;
  standard: string;
  resolution: string;
  readings: string[];
}

export interface CalibrationRecordSummary {
  id: string;
  recordNumber: string;
  certificateNumber: string | null;
  status: CalibrationStatus;
  workflowNote: string | null;
  updatedAt: string;
  company: { id: string; name: string };
  instrumentForm: { id: string; name: string; code: string; revision: string };
}

export interface CalibrationRecordDetail extends CalibrationRecordSummary {
  formDataJson: CalibrationFormData;
  createdAt: string;
  createdBy: { id: string; name: string };
  reviewedBy: { id: string; name: string } | null;
  approvedBy: { id: string; name: string } | null;
}

export interface CalibrationOptions {
  companies: Array<{ id: string; name: string }>;
  instrumentForms: Array<{
    id: string;
    code: string;
    name: string;
    revision: string;
    mappingVerified: boolean;
    fields: InstrumentFieldKey[];
    additionalFields: DynamicFieldDefinition[];
    measurementTables: MeasurementTableDefinition[];
  }>;
}

export interface DynamicFieldDefinition {
  key: string;
  label: string;
  inputType?: 'text' | 'date' | 'textarea';
  placeholder?: string;
}

export interface MeasurementTableLeafColumnDefinition {
  key: string;
  label: string;
  lockedValues?: string[];
  unit?: string;
  inputType?: 'text' | 'number' | 'select';
  options?: string[];
}

export interface MeasurementTableColumnGroupDefinition {
  label: string;
  children: MeasurementTableColumnDefinition[];
}

export type MeasurementTableColumnDefinition = MeasurementTableLeafColumnDefinition | MeasurementTableColumnGroupDefinition;

export interface MeasurementTableDefinition {
  id: string;
  title: string;
  description?: string;
  /** @deprecated Use initialRowCount and templateRowCount for V2 definitions. */
  rowCount: number;
  initialRowCount?: number;
  templateRowCount?: number;
  minRows?: number;
  maxRows?: number;
  fixedRows?: boolean;
  columns: MeasurementTableColumnDefinition[];
}

export function isMeasurementTableLeafColumn(
  column: MeasurementTableColumnDefinition,
): column is MeasurementTableLeafColumnDefinition {
  return 'key' in column;
}

export function getMeasurementTableLeafColumns(
  columns: MeasurementTableColumnDefinition[],
): MeasurementTableLeafColumnDefinition[] {
  return columns.flatMap((column) => (
    isMeasurementTableLeafColumn(column) ? [column] : getMeasurementTableLeafColumns(column.children)
  ));
}

export interface InstrumentFormSummaryItem {
  id: string;
  code: string;
  name: string;
  revision: string;
  description: string | null;
  sheet: string;
  workbook: string;
  needsTemplateReview: boolean;
  mappingVerified: boolean;
  fieldsCount: number;
  tablesCount: number;
  schemaJson: unknown;
  updatedAt: string;
}

export interface InstrumentFormDetailItem {
  id: string;
  code: string;
  name: string;
  revision: string;
  description: string | null;
  templateFilePath: string;
  schemaJson: {
    version: number;
    fields: InstrumentFieldKey[];
    sections: Array<{ id: string; label: string }>;
    additionalFields: DynamicFieldDefinition[];
    measurementTables: MeasurementTableDefinition[];
  };
  mappingJson: {
    version: number;
    workbook: string;
    sheet: string;
    needsTemplateReview: boolean;
    mappingVerified: boolean;
    cells: Record<string, string[]>;
    tables: Array<{
      id: string;
      firstRow: number;
      templateRowCount: number;
      columns: Record<string, string>;
    }>;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyItem {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  recordsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyDetailItem extends CompanyItem {
  records: Array<{
    id: string;
    recordNumber: string;
    certificateNumber: string | null;
    status: CalibrationStatus;
    createdAt: string;
    updatedAt: string;
    instrumentForm: {
      id: string;
      code: string;
      name: string;
    };
    createdBy: {
      id: string;
      name: string;
    };
  }>;
}

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdRecordsCount: number;
  createdAt: string;
  updatedAt: string;
}

