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
