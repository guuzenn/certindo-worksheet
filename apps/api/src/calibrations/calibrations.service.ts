import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CalibrationStatus, Prisma } from '@prisma/client';
import type { AuthUser, UserRole } from '@certindo/types';
import type { CalibrationStatusTransitionInput, CreateCalibrationInput, UpdateCalibrationInput } from '@certindo/validation';
import {
  instrumentFieldKeys,
  type DynamicFieldDefinition,
  type FormFieldLabelKey,
  type InstrumentFieldKey,
  type MeasurementTableColumnDefinition,
  type MeasurementTableDefinition,
} from '@certindo/types';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FileStorageService } from '../storage/file-storage.service';
import { OoxmlWorkbookService } from './ooxml-workbook.service';

const recordInclude = {
  company: { select: { id: true, name: true } },
  instrumentForm: { select: { id: true, code: true, name: true, revision: true } },
  createdBy: { select: { id: true, name: true } },
  reviewedBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
} satisfies Prisma.CalibrationRecordInclude;

@Injectable()
export class CalibrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workbooks: OoxmlWorkbookService,
    private readonly storage: FileStorageService,
  ) {}

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
        select: { id: true, code: true, name: true, revision: true, schemaJson: true, mappingJson: true },
      }),
    ]);
    return {
      companies,
      instrumentForms: instrumentForms.map(({ schemaJson, mappingJson, ...form }) => {
        const schema = schemaJson && typeof schemaJson === 'object' && !Array.isArray(schemaJson) ? schemaJson : {};
        const mapping = mappingJson && typeof mappingJson === 'object' && !Array.isArray(mappingJson) ? mappingJson : {};
        const rawFields = 'fields' in schema && Array.isArray(schema.fields) ? schema.fields : [];
        const fields = rawFields.filter((field): field is InstrumentFieldKey =>
          instrumentFieldKeys.includes(field as InstrumentFieldKey),
        );
        const additionalFields = 'additionalFields' in schema && Array.isArray(schema.additionalFields)
          ? schema.additionalFields.filter(isDynamicFieldDefinition)
          : [];
        const measurementTables = 'measurementTables' in schema && Array.isArray(schema.measurementTables)
          ? schema.measurementTables.filter(isMeasurementTableDefinition)
          : [];
        const rawFieldLabels = asObject(schema.fieldLabels);
        const fieldLabels = Object.fromEntries(Object.entries(rawFieldLabels).filter(
          (entry): entry is [FormFieldLabelKey, string] => (
            (entry[0] === 'calibrationDate' || entry[0] === 'company' || instrumentFieldKeys.includes(entry[0] as InstrumentFieldKey))
            && typeof entry[1] === 'string'
          ),
        ));
        const instrumentNameDefault = typeof schema.instrumentNameDefault === 'string'
          ? schema.instrumentNameDefault
          : form.name;
        return {
          ...form,
          mappingVerified: mapping.mappingVerified === true,
          instrumentNameDefault,
          fieldLabels,
          fields,
          additionalFields,
          measurementTables,
        };
      }),
    };
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
        certificateNumber: input.certificateNumber,
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
        certificateNumber: input.certificateNumber,
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

  async transitionStatus(id: string, input: CalibrationStatusTransitionInput, user: AuthUser) {
    const current = await this.findOne(id);
    const data = calibrationTransitionData(current.status, input.status, input.note, user);
    const result = await this.prisma.calibrationRecord.updateMany({
      where: { id, status: current.status },
      data,
    });
    if (result.count !== 1) {
      throw new ConflictException('Status rekaman telah berubah. Muat ulang data dan coba lagi');
    }
    return this.findOne(id);
  }

  async generateWorkbook(id: string) {
    const record = await this.prisma.calibrationRecord.findUnique({
      where: { id },
      include: { company: true, instrumentForm: true },
    });
    if (!record) throw new NotFoundException('Rekaman kalibrasi tidak ditemukan');

    const mapping = asObject(record.instrumentForm.mappingJson);
    if (mapping.mappingVerified !== true) {
      throw new BadRequestException('Mapping template ini belum diverifikasi terhadap workbook sumber dan belum dapat diekspor');
    }
    const sheet = typeof mapping.sheet === 'string' ? mapping.sheet : null;
    const rawCells = asObject(mapping.cells);
    const formSchema = asObject(record.instrumentForm.schemaJson);
    const additionalFieldDefinitions = Array.isArray(formSchema.additionalFields)
      ? formSchema.additionalFields.filter(isDynamicFieldDefinition)
      : [];
    const additionalFieldDefinitionsByKey = new Map(additionalFieldDefinitions.map((field) => [field.key, field]));
    const worksheetTables = parseWorksheetTableMappings(mapping.tables);
    if (!sheet || !Object.keys(rawCells).length) {
      throw new BadRequestException('Mapping Excel untuk template ini belum tersedia');
    }

    const fileName = `${record.recordNumber}-${record.instrumentForm.code}.xlsx`;
    const formData = asObject(record.formDataJson);
    const values = {
      certificateNumber: record.certificateNumber ?? '',
      calibrationDate: formatIndonesianDate(readPath(formData, 'calibrationDate')),
      calibrationLocation: readPath(formData, 'calibrationLocation'),
      instrument: asObject(formData.instrument),
      environment: asObject(formData.environment),
      measurements: formData.measurements,
      additionalFields: asObject(formData.additionalFields),
      company: { name: record.company.name },
    };
    const cellsToWrite: Record<string, string> = {};
    const measurementTables = asObject(asObject(formData.measurements).tables);
    const rawMeasurements = asObject(formData.measurements);
    const tableLayouts = worksheetTables.map((table) => {
      const rawRows = measurementTables[table.id];
      const rows: unknown[] = Array.isArray(rawRows) && rawRows.length
        ? rawRows
        : legacyWorksheetRows(rawMeasurements, table.id);
      const rowCount = Math.max(1, rows.length);
      return {
        ...table,
        rows,
        rowCount,
        renderedRowCount: worksheetTableRenderedRowCount(table, rowCount),
      };
    });
    const cellShiftLayouts = tableLayouts.map((table) => ({
      ...table,
      rowCount: table.renderedRowCount,
    }));

    for (const [dataPath, rawTargets] of Object.entries(rawCells)) {
      if (dataPath.startsWith('measurements.tables.')) continue;
      if (!Array.isArray(rawTargets)) continue;
      const rawValue = readPath(values, dataPath);
      const cellValue = toCellValue(rawValue);
      if (!cellValue) continue;
      let value = dataPath.startsWith('environment.temperature')
        ? `${cellValue} °C`
        : dataPath.startsWith('environment.humidity')
          ? `${cellValue} %RH`
          : cellValue;
      if (dataPath.startsWith('additionalFields.')) {
        const definition = additionalFieldDefinitionsByKey.get(dataPath.slice('additionalFields.'.length));
        value = formatDynamicFieldValue(value, definition);
      }
      for (const target of rawTargets) {
        if (typeof target === 'string') {
          cellsToWrite[shiftCellReference(target, cellShiftLayouts)] = value;
        }
      }
    }

    let precedingOffset = 0;
    for (const table of [...tableLayouts].sort((left, right) => left.firstRow - right.firstRow)) {
      const outputFirstRow = table.firstRow + precedingOffset;
      for (let rowIndex = 0; rowIndex < table.rowCount; rowIndex += 1) {
        const row = asObject(table.rows[rowIndex]);
        for (const [key, column] of Object.entries(table.columns)) {
          const value = toCellValue(row[key]);
          if (value) cellsToWrite[`${column}${outputFirstRow + rowIndex}`] = value;
        }
      }
      precedingOffset += table.renderedRowCount - table.templateRowCount;
    }

    const output = await this.workbooks.fillTemplateBuffer(
      await this.storage.read(record.instrumentForm.templateFilePath),
      sheet,
      cellsToWrite,
      tableLayouts.map((table) => ({
        firstRow: table.firstRow,
        templateRowCount: table.templateRowCount,
        rowCount: table.renderedRowCount,
      })),
    );
    const generatedFilePath = await this.storage.writeGenerated(fileName, output);
    await this.prisma.calibrationRecord.update({ where: { id }, data: { generatedFilePath } });
    return { fileName, generatedFilePath };
  }

  async getGeneratedWorkbook(id: string): Promise<{ buffer: Buffer; fileName: string }> {
    const record = await this.prisma.calibrationRecord.findUnique({
      where: { id },
      select: { generatedFilePath: true, recordNumber: true, instrumentForm: { select: { code: true } } },
    });
    if (!record) throw new NotFoundException('Rekaman kalibrasi tidak ditemukan');
    if (!record.generatedFilePath) throw new BadRequestException('File Excel belum dibuat');
    return {
      buffer: await this.storage.read(record.generatedFilePath),
      fileName: `${record.recordNumber}-${record.instrumentForm.code}.xlsx`,
    };
  }
}

type CalibrationTransitionData = Prisma.CalibrationRecordUncheckedUpdateManyInput;

export function calibrationTransitionData(
  currentStatus: CalibrationStatus,
  targetStatus: CalibrationStatusTransitionInput['status'],
  note: string | undefined,
  user: Pick<AuthUser, 'id' | 'role'>,
): CalibrationTransitionData {
  const transition = `${currentStatus}->${targetStatus}`;
  const allowedRoles: Partial<Record<string, UserRole[]>> = {
    'DRAFT->UNDER_REVIEW': ['ADMIN', 'TECHNICIAN'],
    'UNDER_REVIEW->DRAFT': ['ADMIN', 'REVIEWER', 'APPROVER'],
    'UNDER_REVIEW->CONFIRMED': ['ADMIN', 'REVIEWER', 'APPROVER'],
    'UNDER_REVIEW->COMPLETED': ['ADMIN', 'APPROVER'],
    'CONFIRMED->COMPLETED': ['ADMIN', 'APPROVER'],
  };
  const roles = allowedRoles[transition];
  if (!roles) throw new BadRequestException(`Transisi status ${currentStatus} ke ${targetStatus} tidak diizinkan`);
  if (!roles.includes(user.role)) throw new ForbiddenException('Peran Anda tidak diizinkan melakukan transisi status ini');

  if (targetStatus === 'DRAFT') {
    const revisionNote = note?.trim();
    if (!revisionNote) throw new BadRequestException('Catatan perbaikan wajib diisi');
    return { status: targetStatus, workflowNote: revisionNote, reviewedById: user.id, approvedById: null };
  }
  if (targetStatus === 'UNDER_REVIEW') {
    return { status: targetStatus, workflowNote: null, reviewedById: null, approvedById: null };
  }
  return {
    status: targetStatus,
    workflowNote: note?.trim() || null,
    reviewedById: user.id,
    ...(targetStatus === 'COMPLETED' || user.role === 'APPROVER' || user.role === 'ADMIN'
      ? { approvedById: user.id }
      : {}),
  };
}

interface WorksheetTableMapping {
  id: string;
  firstRow: number;
  templateRowCount: number;
  preserveTemplateRows?: boolean;
  columns: Record<string, string>;
}

export function worksheetTableRenderedRowCount(
  table: Pick<WorksheetTableMapping, 'templateRowCount' | 'preserveTemplateRows'>,
  dataRowCount: number,
): number {
  return table.preserveTemplateRows ? table.templateRowCount : Math.max(1, dataRowCount);
}

export function formatDynamicFieldValue(
  value: string,
  definition?: Pick<DynamicFieldDefinition, 'exportPrefix' | 'exportSuffix'>,
): string {
  return `${definition?.exportPrefix ?? ''}${value}${definition?.exportSuffix ?? ''}`;
}

function legacyWorksheetRows(measurements: Record<string, unknown>, tableId: string): unknown[] {
  const rawRows = measurements[tableId];
  if (!Array.isArray(rawRows)) return [];
  if (tableId === 'clockwise' || tableId === 'counterClockwise') {
    return rawRows.map((rawRow) => {
      const row = asObject(rawRow);
      const readings = Array.isArray(row.readings) ? row.readings : [];
      return {
        indication: row.indication,
        ...Object.fromEntries(readings.map((value, index) => [`reading${index + 1}`, value])),
      };
    });
  }
  if (tableId === 'dissolvedOxygen') {
    return rawRows.map((rawRow) => {
      const row = asObject(rawRow);
      const readings = Array.isArray(row.readings) ? row.readings : [];
      return {
        number: row.number,
        standard: row.standard,
        resolution: row.resolution,
        ...Object.fromEntries(readings.map((value, index) => [`reading${index + 1}`, value])),
      };
    });
  }
  return [];
}

function parseWorksheetTableMappings(value: unknown): WorksheetTableMapping[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((rawTable) => {
    const table = asObject(rawTable);
    const rawColumns = asObject(table.columns);
    const columns = Object.fromEntries(
      Object.entries(rawColumns).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
    return typeof table.id === 'string'
      && typeof table.firstRow === 'number'
      && typeof table.templateRowCount === 'number'
      && Object.keys(columns).length
      ? [{
        id: table.id,
        firstRow: table.firstRow,
        templateRowCount: table.templateRowCount,
        preserveTemplateRows: table.preserveTemplateRows === true,
        columns,
      }]
      : [];
  });
}

function shiftCellReference(
  reference: string,
  tables: Array<{ firstRow: number; templateRowCount: number; rowCount: number }>,
): string {
  const match = reference.match(/^([A-Z]+)(\d+)$/i);
  if (!match?.[1] || !match[2]) return reference;
  const originalRow = Number(match[2]);
  const offset = tables.reduce((total, table) => (
    originalRow > table.firstRow + table.templateRowCount - 1
      ? total + table.rowCount - table.templateRowCount
      : total
  ), 0);
  return `${match[1]}${originalRow + offset}`;
}

function isDynamicFieldDefinition(value: unknown): value is DynamicFieldDefinition {
  const item = asObject(value);
  return typeof item.key === 'string' && typeof item.label === 'string';
}

function isMeasurementTableDefinition(value: unknown): value is MeasurementTableDefinition {
  const item = asObject(value);
  return typeof item.id === 'string'
    && typeof item.title === 'string'
    && typeof item.rowCount === 'number'
    && Array.isArray(item.columns)
    && item.columns.every(isMeasurementTableColumnDefinition);
}

function isMeasurementTableColumnDefinition(value: unknown): value is MeasurementTableColumnDefinition {
  const item = asObject(value);
  if (typeof item.label !== 'string') return false;
  if (typeof item.key === 'string') return true;
  return Array.isArray(item.children)
    && item.children.length > 0
    && item.children.every(isMeasurementTableColumnDefinition);
}

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current === null || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

function toCellValue(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function formatIndonesianDate(value: unknown): string {
  if (typeof value !== 'string') return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${Number(match[3])} ${months[Number(match[2]) - 1]} ${match[1]}`;
}
