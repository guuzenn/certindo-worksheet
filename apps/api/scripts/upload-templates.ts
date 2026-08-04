import 'dotenv/config';
import { put } from '@vercel/blob';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) throw new Error('BLOB_READ_WRITE_TOKEN wajib diisi');

const repositoryRoot = resolve(process.cwd(), '..', '..');
const templates = [
  { env: 'TEMPLATE_EARLY_URL', file: 'Lembar Kerja 0X-94.xlsx', pathname: 'templates/Lembar Kerja 0X-94.xlsx' },
  { env: 'TEMPLATE_CURRENT_URL', file: 'Lembar Kerja 095-163.xlsx', pathname: 'templates/Lembar Kerja 095-163.xlsx' },
] as const;

for (const template of templates) {
  const body = await readFile(resolve(repositoryRoot, 'storage', 'templates', template.file));
  const blob = await put(template.pathname, body, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    token,
  });
  console.log(`${template.env}="${blob.url}"`);
}
