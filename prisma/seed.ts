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

  for (const form of instrumentForms) {
    const revision = form.revision ?? 'DRAFT-1';
    const workbook = form.workbook ?? currentWorkbookPath;
    const templateFilePath = process.env.STORAGE_DRIVER === 'blob'
      ? workbook === earlyWorkbookPath
        ? process.env.TEMPLATE_EARLY_URL ?? workbook
        : process.env.TEMPLATE_CURRENT_URL ?? workbook
      : workbook;
    const fields = getInstrumentFields(form);
    const description = form.needsTemplateReview
      ? 'Template terhubung dan dapat digunakan untuk draft. Metadata sumber perlu ditinjau sebelum ekspor final.'
      : 'Template terhubung dari katalog workbook lembar kerja Certindo.';
    await prisma.instrumentForm.upsert({
      where: { code_revision: { code: form.code, revision } },
      update: {
        name: form.name,
        description,
        isActive: true,
        templateFilePath,
        mappingJson: {
          version: 1,
          workbook,
          sheet: form.sheet,
          needsTemplateReview: form.needsTemplateReview ?? false,
          cells: getInstrumentCellMappings(form),
          tables: getWorksheetTableMappings(form),
        },
        schemaJson: {
          version: 1,
          fields,
          sections: [
            { id: 'instrument', label: 'Identitas Alat' },
            { id: 'calibration', label: 'Data Kalibrasi' },
          ],
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
          version: 1,
          fields,
          sections: [
            { id: 'instrument', label: 'Identitas Alat' },
            { id: 'calibration', label: 'Data Kalibrasi' },
          ],
          additionalFields: form.additionalFields ?? [],
          measurementTables: form.measurementTables ?? [],
        },
        mappingJson: {
          version: 1,
          workbook,
          sheet: form.sheet,
          needsTemplateReview: form.needsTemplateReview ?? false,
          cells: getInstrumentCellMappings(form),
          tables: getWorksheetTableMappings(form),
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
