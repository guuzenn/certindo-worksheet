import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CalibrationStatus, Prisma } from '@prisma/client';
import type { CreateCalibrationInput, UpdateCalibrationInput } from '@certindo/validation';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

const recordInclude = {
  company: { select: { id: true, name: true } },
  instrumentForm: { select: { id: true, code: true, name: true, revision: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.CalibrationRecordInclude;

@Injectable()
export class CalibrationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(search?: string, status?: CalibrationStatus) {
    const term = search?.trim();
    return this.prisma.calibrationRecord.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(term
          ? {
              OR: [
                { recordNumber: { contains: term, mode: 'insensitive' as const } },
                { certificateNumber: { contains: term, mode: 'insensitive' as const } },
                { company: { name: { contains: term, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: recordInclude,
    });
  }

  async options() {
    const [companies, instrumentForms] = await this.prisma.$transaction([
      this.prisma.company.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      this.prisma.instrumentForm.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, code: true, name: true, revision: true },
      }),
    ]);
    return { companies, instrumentForms };
  }

  async findOne(id: string) {
    const record = await this.prisma.calibrationRecord.findUnique({ where: { id }, include: recordInclude });
    if (!record) throw new NotFoundException('Rekaman kalibrasi tidak ditemukan');
    return record;
  }

  async create(input: CreateCalibrationInput, userId: string) {
    const [company, instrumentForm] = await this.prisma.$transaction([
      this.prisma.company.findUnique({ where: { id: input.companyId }, select: { id: true } }),
      this.prisma.instrumentForm.findFirst({
        where: { id: input.instrumentFormId, isActive: true },
        select: { id: true },
      }),
    ]);
    if (!company) throw new BadRequestException('Perusahaan tidak ditemukan');
    if (!instrumentForm) throw new BadRequestException('Template instrumen tidak ditemukan atau tidak aktif');

    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const recordNumber = `CAL-${date}-${randomUUID().slice(0, 6).toUpperCase()}`;
    return this.prisma.calibrationRecord.create({
      data: {
        recordNumber,
        companyId: input.companyId,
        instrumentFormId: input.instrumentFormId,
        formDataJson: input.formData,
        createdById: userId,
      },
      include: recordInclude,
    });
  }

  async update(id: string, input: UpdateCalibrationInput, userId: string) {
    const current = await this.findOne(id);
    if (current.status !== 'DRAFT') throw new BadRequestException('Hanya rekaman draft yang dapat diubah');
    if (input.companyId) {
      const company = await this.prisma.company.findUnique({ where: { id: input.companyId }, select: { id: true } });
      if (!company) throw new BadRequestException('Perusahaan tidak ditemukan');
    }
    const latestRevision = await this.prisma.calibrationRevision.aggregate({
      where: { calibrationRecordId: id },
      _max: { revisionNumber: true },
    });
    return this.prisma.calibrationRecord.update({
      where: { id },
      data: {
        ...(input.companyId ? { companyId: input.companyId } : {}),
        formDataJson: input.formData,
        revisions: {
          create: {
            revisionNumber: (latestRevision._max.revisionNumber ?? 0) + 1,
            formDataJson: input.formData,
            changedById: userId,
          },
        },
      },
      include: recordInclude,
    });
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    if (current.status !== 'DRAFT') throw new BadRequestException('Hanya rekaman draft yang dapat dihapus');
    await this.prisma.calibrationRecord.delete({ where: { id } });
    return { id };
  }
}
