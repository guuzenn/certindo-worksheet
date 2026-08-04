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
  updatedAt: string;
  company: { id: string; name: string };
  instrumentForm: { id: string; name: string; code: string; revision: string };
}

export interface CalibrationRecordDetail extends CalibrationRecordSummary {
  formDataJson: CalibrationFormData;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export interface CalibrationOptions {
  companies: Array<{ id: string; name: string }>;
  instrumentForms: Array<{
    id: string;
    code: string;
    name: string;
    revision: string;
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

export interface MeasurementTableColumnDefinition {
  key: string;
  label: string;
  lockedValues?: string[];
}

export interface MeasurementTableDefinition {
  id: string;
  title: string;
  rowCount: number;
  columns: MeasurementTableColumnDefinition[];
}
