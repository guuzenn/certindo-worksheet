import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstrumentFormsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(search?: string, needsReviewOnly?: boolean) {
    const term = search?.trim();
    const forms = await this.prisma.instrumentForm.findMany({
      where: {
        isActive: true,
        ...(term
          ? {
              OR: [
                { code: { contains: term, mode: 'insensitive' } },
                { name: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        revision: true,
        description: true,
        schemaJson: true,
        mappingJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const mapped = forms.map((form) => {
      const mapping = (form.mappingJson && typeof form.mappingJson === 'object' && !Array.isArray(form.mappingJson))
        ? (form.mappingJson as Record<string, unknown>)
        : {};
      const schema = (form.schemaJson && typeof form.schemaJson === 'object' && !Array.isArray(form.schemaJson))
        ? (form.schemaJson as Record<string, unknown>)
        : {};

      const fields = Array.isArray(schema.fields) ? schema.fields : [];
      const additionalFields = Array.isArray(schema.additionalFields) ? schema.additionalFields : [];
      const measurementTables = Array.isArray(schema.measurementTables) ? schema.measurementTables : [];

      return {
        id: form.id,
        code: form.code,
        name: form.name,
        revision: form.revision,
        description: form.description,
        sheet: typeof mapping.sheet === 'string' ? mapping.sheet : '',
        workbook: typeof mapping.workbook === 'string' ? mapping.workbook : '',
        needsTemplateReview: Boolean(mapping.needsTemplateReview),
        fieldsCount: fields.length + additionalFields.length,
        tablesCount: measurementTables.length,
        schemaJson: form.schemaJson,
        updatedAt: form.updatedAt,
      };
    });

    if (needsReviewOnly) {
      return mapped.filter((item) => item.needsTemplateReview);
    }

    return mapped;
  }

  async findOne(id: string) {
    const form = await this.prisma.instrumentForm.findUnique({
      where: { id },
    });
    if (!form || !form.isActive) {
      throw new NotFoundException('Template instrumen tidak ditemukan');
    }
    return form;
  }
}
