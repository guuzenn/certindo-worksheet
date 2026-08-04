import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { instrumentForms } from '../prisma/instrument-forms';

async function main(): Promise<void> {
  const outputPath = resolve('storage/generated/instrument-form-catalog.json');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(instrumentForms, null, 2), 'utf8');
  console.log(outputPath);
}

void main();
