import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { calibrationTransitionData } from '../src/calibrations/calibrations.service';

describe('calibrationTransitionData', () => {
  it('mengizinkan teknisi mengajukan draft untuk diperiksa', () => {
    expect(calibrationTransitionData('DRAFT', 'UNDER_REVIEW', undefined, { id: 'tech-1', role: 'TECHNICIAN' })).toEqual({
      status: 'UNDER_REVIEW',
      workflowNote: null,
      reviewedById: null,
      approvedById: null,
    });
  });

  it('menolak reviewer yang mencoba mengajukan draft', () => {
    expect(() => calibrationTransitionData('DRAFT', 'UNDER_REVIEW', undefined, { id: 'reviewer-1', role: 'REVIEWER' }))
      .toThrow(ForbiddenException);
  });

  it('menyimpan reviewer dan catatan saat mengembalikan rekaman ke draft', () => {
    expect(calibrationTransitionData('UNDER_REVIEW', 'DRAFT', '  Ulangi titik ketiga.  ', { id: 'reviewer-1', role: 'REVIEWER' })).toEqual({
      status: 'DRAFT',
      workflowNote: 'Ulangi titik ketiga.',
      reviewedById: 'reviewer-1',
      approvedById: null,
    });
  });

  it('mengizinkan approver menyelesaikan rekaman yang telah dikonfirmasi', () => {
    expect(calibrationTransitionData('CONFIRMED', 'COMPLETED', undefined, { id: 'approver-1', role: 'APPROVER' })).toMatchObject({
      status: 'COMPLETED',
      reviewedById: 'approver-1',
      approvedById: 'approver-1',
    });
  });

  it('menolak lompatan status yang tidak terdaftar', () => {
    expect(() => calibrationTransitionData('DRAFT', 'COMPLETED', undefined, { id: 'admin-1', role: 'ADMIN' }))
      .toThrow(BadRequestException);
  });
});
