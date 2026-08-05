import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateCompanyInput } from '@certindo/validation';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(search?: string) {
    const term = search?.trim();
    const companies = await this.prisma.company.findMany({
      ...(term
        ? {
            where: {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { address: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
                { phone: { contains: term, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { records: true },
        },
      },
    });

    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      address: company.address,
      phone: company.phone,
      email: company.email,
      recordsCount: company._count.records,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
    }));
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: { records: true },
        },
        records: {
          take: 20,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            recordNumber: true,
            certificateNumber: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            instrumentForm: {
              select: { id: true, code: true, name: true },
            },
            createdBy: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Perusahaan tidak ditemukan');
    }

    return {
      id: company.id,
      name: company.name,
      address: company.address,
      phone: company.phone,
      email: company.email,
      recordsCount: company._count.records,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
      records: company.records.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  }

  async create(input: CreateCompanyInput) {
    const created = await this.prisma.company.create({
      data: {
        name: input.name,
        address: input.address || null,
        phone: input.phone || null,
        email: input.email || null,
      },
    });
    return created;
  }

  async update(id: string, input: Partial<CreateCompanyInput>) {
    await this.findOne(id);
    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.address !== undefined ? { address: input.address || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        ...(input.email !== undefined ? { email: input.email || null } : {}),
      },
    });
    return updated;
  }

  async remove(id: string) {
    const company = await this.findOne(id);
    if (company.recordsCount > 0) {
      throw new BadRequestException(
        `Perusahaan ${company.name} memiliki ${company.recordsCount} lembar kerja kalibrasi dan tidak dapat dihapus.`,
      );
    }
    await this.prisma.company.delete({ where: { id } });
    return { success: true };
  }
}
