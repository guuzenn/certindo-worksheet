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
  instrument: {
    name: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    capacity: string;
    resolution: string;
  };
  notes: string;
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
  instrumentForms: Array<{ id: string; code: string; name: string; revision: string }>;
}
