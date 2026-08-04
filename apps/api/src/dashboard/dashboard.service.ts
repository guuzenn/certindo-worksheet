import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [total, draft, underReview, completed, recent] = await this.prisma.$transaction([
      this.prisma.calibrationRecord.count(),
      this.prisma.calibrationRecord.count({ where: { status: 'DRAFT' } }),
      this.prisma.calibrationRecord.count({ where: { status: 'UNDER_REVIEW' } }),
      this.prisma.calibrationRecord.count({ where: { status: 'COMPLETED' } }),
      this.prisma.calibrationRecord.findMany({
        take: 8,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true, recordNumber: true, certificateNumber: true, status: true, updatedAt: true,
          company: { select: { name: true } }, instrumentForm: { select: { name: true, code: true } },
        },
      }),
    ]);
    return { counts: { total, draft, underReview, completed }, recent };
  }
}
