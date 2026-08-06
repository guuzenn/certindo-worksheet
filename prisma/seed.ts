import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { currentWorkbookPath, earlyWorkbookPath, getInstrumentCellMappings, getInstrumentFields, getWorksheetTableMappings, instrumentForms } from './instrument-forms';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@certindo.co.id').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { name: 'Administrator Certindo', role: UserRole.ADMIN },
    create: { name: 'Administrator Certindo', email, passwordHash, role: UserRole.ADMIN },
  });

  await prisma.company.upsert({
    where: { id: 'sample-company-certindo' },
    update: {},
    create: {
      id: 'sample-company-certindo',
      name: 'PT Certindonesia',
      address: 'Indonesia',
      email: 'info@certindo.co.id',
    },
  });

  await prisma.instrumentForm.updateMany({
    where: { code: 'TORQUE-GAUGE', revision: 'DRAFT-1' },
    data: { code: 'CCI-KAL-FOM-152' },
  });

  // Preserve existing record IDs and calibration relations while replacing the temporary
  // Timbangan variant code with the official form code and workbook revisions.
  await prisma.instrumentForm.updateMany({
    where: { code: 'CCI-KAL-FOM-028', revision: 'DRAFT-1' },
    data: { revision: '05' },
  });
  await prisma.instrumentForm.updateMany({
    where: { code: 'CCI-KAL-FOM-028-B', revision: 'DRAFT-1' },
    data: { code: 'CCI-KAL-FOM-028', revision: '04' },
  });
  await prisma.instrumentForm.updateMany({
    where: { code: { in: ['CCI-KAL-FOM-057', 'CCI-KAL-FOM-057-B'] }, revision: 'DRAFT-1' },
    data: { revision: '03' },
  });
  await prisma.instrumentForm.updateMany({
    where: { code: 'CCI-KAL-FOM-0XX', revision: 'DRAFT-1' },
    data: { revision: '02' },
  });
  await prisma.instrumentForm.updateMany({
    where: { code: 'CCI-KAL-FOM-010', revision: 'DRAFT-1' },
    data: { revision: '03' },
  });
  await prisma.instrumentForm.updateMany({
    where: { code: 'CCI-KAL-FOM-027', revision: 'DRAFT-1' },
    data: { revision: '04' },
  });
  await prisma.instrumentForm.updateMany({
    where: { code: 'CCI-KAL-FOM-053', revision: 'DRAFT-1' },
    data: { revision: '04' },
  });
  for (const [code, revision] of [
    ['CCI-KAL-FOM-054', '02'],
    ['CCI-KAL-FOM-055', '04'],
    ['CCI-KAL-FOM-056', '04'],
    ['CCI-KAL-FOM-058', '00'],
  ] as const) {
    await prisma.instrumentForm.updateMany({
      where: { code, revision: 'DRAFT-1' },
      data: { revision },
    });
  }

  for (const form of instrumentForms) {
    const revision = form.revision ?? 'DRAFT-1';
    const workbook = form.workbook ?? currentWorkbookPath;
    const templateFilePath = process.env.STORAGE_DRIVER === 'blob'
      ? workbook === earlyWorkbookPath
        ? process.env.TEMPLATE_EARLY_URL ?? workbook
        : process.env.TEMPLATE_CURRENT_URL ?? workbook
      : workbook;
    const fields = getInstrumentFields(form);
    const mappingVerified = form.mappingVerified === true;
    const schemaVersion = form.measurementTables?.some((table) => (
      table.initialRowCount !== undefined
      || table.templateRowCount !== undefined
      || table.layout !== undefined
      || table.preserveTemplateRows !== undefined
      || table.columns.some((column) => 'children' in column)
    )) ? 2 : 1;
    const description = mappingVerified
      ? 'Struktur form dan mapping Excel telah diverifikasi terhadap workbook sumber.'
      : 'Template tersedia untuk pemetaan. Struktur tabel dan target sel perlu diverifikasi sebelum ekspor.';
    await prisma.instrumentForm.upsert({
      where: { code_revision: { code: form.code, revision } },
      update: {
        name: form.name,
        description,
        isActive: true,
        templateFilePath,
        mappingJson: {
          version: schemaVersion,
          workbook,
          sheet: form.sheet,
          needsTemplateReview: !mappingVerified,
          mappingVerified,
          cells: getInstrumentCellMappings(form),
          tables: getWorksheetTableMappings(form),
          conditionalCells: form.conditionalCellMappings ?? [],
        },
        schemaJson: {
          version: schemaVersion,
          fields,
          sections: [
            { id: 'instrument', label: 'Identitas Alat' },
            { id: 'calibration', label: 'Data Kalibrasi' },
          ],
          instrumentNameDefault: form.instrumentNameDefault ?? form.name,
          fieldLabels: form.fieldLabels ?? {},
          cellValueFormats: form.cellValueFormats ?? {},
          additionalFields: form.additionalFields ?? [],
          measurementTables: form.measurementTables ?? [],
        },
      },
      create: {
        code: form.code,
        name: form.name,
        revision,
        description,
        templateFilePath,
        schemaJson: {
          version: schemaVersion,
          fields,
          sections: [
            { id: 'instrument', label: 'Identitas Alat' },
            { id: 'calibration', label: 'Data Kalibrasi' },
          ],
          instrumentNameDefault: form.instrumentNameDefault ?? form.name,
          fieldLabels: form.fieldLabels ?? {},
          cellValueFormats: form.cellValueFormats ?? {},
          additionalFields: form.additionalFields ?? [],
          measurementTables: form.measurementTables ?? [],
        },
        mappingJson: {
          version: schemaVersion,
          workbook,
          sheet: form.sheet,
          needsTemplateReview: !mappingVerified,
          mappingVerified,
          cells: getInstrumentCellMappings(form),
          tables: getWorksheetTableMappings(form),
          conditionalCells: form.conditionalCellMappings ?? [],
        },
      },
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
