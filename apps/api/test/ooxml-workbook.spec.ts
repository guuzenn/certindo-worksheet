import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  currentWorkbookPath,
  getInstrumentCellMappings,
  getWorksheetTableMappings,
  instrumentForms,
} from '../../../prisma/instrument-forms';
import { readPath } from '../src/calibrations/calibrations.service';
import { OoxmlWorkbookService, replaceCellValue, resizeWorksheetTables } from '../src/calibrations/ooxml-workbook.service';

async function expectSingleWorksheet(zip: JSZip, expectedName: string): Promise<void> {
  const workbookFile = zip.file('xl/workbook.xml');
  const relationshipsFile = zip.file('xl/_rels/workbook.xml.rels');
  const contentTypesFile = zip.file('[Content_Types].xml');
  expect(workbookFile).not.toBeNull();
  expect(relationshipsFile).not.toBeNull();
  expect(contentTypesFile).not.toBeNull();
  const workbookXml = await workbookFile!.async('string');
  const relationshipsXml = await relationshipsFile!.async('string');
  const contentTypesXml = await contentTypesFile!.async('string');
  const sheetTags = [...workbookXml.matchAll(/<sheet\b[^>]*\/>/gi)];
  expect(sheetTags).toHaveLength(1);
  expect(sheetTags[0]?.[0]).toContain(`name="${expectedName.replaceAll('&', '&amp;')}"`);
  expect([...relationshipsXml.matchAll(/Type="[^"]+\/worksheet"/gi)]).toHaveLength(1);
  expect([...contentTypesXml.matchAll(/ContentType="application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.worksheet\+xml"/gi)]).toHaveLength(1);
  expect(Object.values(zip.files).filter((file) => /^xl\/worksheets\/sheet\d+\.xml$/.test(file.name))).toHaveLength(1);
}

describe('replaceCellValue', () => {
  it('membaca path bertingkat yang melewati array pengukuran', () => {
    const values = { measurements: { clockwise: [{ indication: '2 Nm', readings: ['2.01'] }] } };
    expect(readPath(values, 'measurements.clockwise.0.readings.0')).toBe('2.01');
  });

  it('mengganti nilai sel sambil mempertahankan style', () => {
    const xml = '<worksheet><sheetData><row r="7"><c r="C7" s="12" t="s"><v>1</v></c></row></sheetData></worksheet>';
    const result = replaceCellValue(xml, 'C7', 'CTD/CAL/001 & Final');

    expect(result).toContain('<c r="C7" s="12" t="inlineStr">');
    expect(result).toContain('CTD/CAL/001 &amp; Final');
    expect(result).not.toContain('<v>1</v>');
  });

  it('mengisi sel self-closing', () => {
    const xml = '<worksheet><sheetData><row r="8"><c r="C8" s="4"/></row></sheetData></worksheet>';
    const result = replaceCellValue(xml, 'C8', 'Torque Gauge');
    expect(result).toContain('Torque Gauge');
    expect(result).toContain('<c r="C8" s="4" t="inlineStr">');
  });

  it('menghapus baris tabel dan menggeser tabel berikutnya, footer, serta merge', () => {
    const xml = '<worksheet><dimension ref="A1:L50"/><sheetData>'
      + '<row r="25"><c r="B25" s="1"/></row><row r="26"><c r="B26" s="2"/></row>'
      + '<row r="44"><c r="B44" s="1"/></row><row r="45"><c r="B45" s="2"/></row>'
      + '<row r="47"><c r="B47" s="3"/></row></sheetData>'
      + '<mergeCells><mergeCell ref="B47:C47"/></mergeCells></worksheet>';
    const result = resizeWorksheetTables(xml, [
      { firstRow: 25, templateRowCount: 2, rowCount: 1 },
      { firstRow: 44, templateRowCount: 2, rowCount: 1 },
    ]);

    expect(result).toContain('<row r="25"><c r="B25" s="2"/></row>');
    expect(result).toContain('<row r="43"><c r="B43" s="2"/></row>');
    expect(result).toContain('<row r="45"><c r="B45" s="3"/></row>');
    expect(result).toContain('ref="B45:C45"');
  });

  it('menambah baris tabel dan menggeser bagian sheet di bawahnya', () => {
    const xml = '<worksheet><dimension ref="A1:L50"/><sheetData>'
      + '<row r="25"><c r="B25" s="1"><v>1</v></c></row><row r="26"><c r="B26" s="2"><v>2</v></c></row>'
      + '<row r="44"><c r="B44" s="1"/></row><row r="45"><c r="B45" s="2"/></row>'
      + '<row r="47"><c r="B47" s="3"/></row></sheetData>'
      + '<mergeCells><mergeCell ref="B47:C47"/></mergeCells></worksheet>';
    const result = resizeWorksheetTables(xml, [
      { firstRow: 25, templateRowCount: 2, rowCount: 4 },
      { firstRow: 44, templateRowCount: 2, rowCount: 3 },
    ]);

    for (const row of [25, 26, 27, 28, 46, 47, 48, 50]) expect(result).toContain(`<row r="${row}">`);
    expect(result).toContain('ref="B50:C50"');
    expect(result).not.toContain('<row r="27"><c r="B27" s="1"><v>1</v></c></row>');
  });

  it('mengisi seluruh mapping identitas dan pengukuran Torque Gauge pada salinan workbook', async () => {
    const torque = instrumentForms.find((form) => form.code === 'CCI-KAL-FOM-152');
    expect(torque?.cellMappings).toBeDefined();
    const mappings = torque?.cellMappings ?? {};
    expect(Object.keys(mappings)).toHaveLength(138);

    const cells = Object.fromEntries(
      Object.values(mappings).flat().map((cell) => [cell, `QA-${cell}`]),
    );
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'certindo-torque-'));
    const outputPath = join(temporaryDirectory, 'torque-gauge.xlsx');

    try {
      await new OoxmlWorkbookService().fillTemplate(
        resolve(process.cwd(), '..', '..', torque?.workbook ?? currentWorkbookPath),
        outputPath,
        torque?.sheet ?? '',
        cells,
      );
      const zip = await JSZip.loadAsync(await readFile(outputPath));
      await expectSingleWorksheet(zip, 'Torque Gauge');
      const worksheetFiles = Object.values(zip.files).filter((file) => /^xl\/worksheets\/sheet\d+\.xml$/.test(file.name));
      const worksheetXml = (await Promise.all(worksheetFiles.map((file) => file.async('string')))).join('\n');
      expect(worksheetXml).toContain('QA-B56');
      expect(worksheetXml).toContain('QA-H65');
      expect(worksheetXml).toContain('QA-B70');
      expect(worksheetXml).toContain('QA-H80');
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('mengisi seluruh mapping Dissolved Oxygen Meter pada salinan workbook', async () => {
    const dissolvedOxygen = instrumentForms.find((form) => form.code === 'CCI-KAL-FOM-153');
    expect(dissolvedOxygen?.cellMappings).toBeDefined();
    const mappings = dissolvedOxygen?.cellMappings ?? {};
    expect(Object.keys(mappings)).toHaveLength(39);

    const cells = Object.fromEntries(
      Object.values(mappings).flat().map((cell) => [cell, `DO-QA-${cell}`]),
    );
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'certindo-do-'));
    const outputPath = join(temporaryDirectory, 'dissolved-oxygen-meter.xlsx');

    try {
      await new OoxmlWorkbookService().fillTemplate(
        resolve(process.cwd(), '..', '..', dissolvedOxygen?.workbook ?? currentWorkbookPath),
        outputPath,
        dissolvedOxygen?.sheet ?? '',
        cells,
      );
      const zip = await JSZip.loadAsync(await readFile(outputPath));
      await expectSingleWorksheet(zip, 'DISSOLVED OXYGEN METER');
      const worksheetFiles = Object.values(zip.files).filter((file) => /^xl\/worksheets\/sheet\d+\.xml$/.test(file.name));
      const worksheetXml = (await Promise.all(worksheetFiles.map((file) => file.async('string')))).join('\n');
      expect(worksheetXml).toContain('DO-QA-F8');
      expect(worksheetXml).toContain('DO-QA-F14');
      expect(worksheetXml).toContain('DO-QA-B19');
      expect(worksheetXml).toContain('DO-QA-G22');
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('mengisi dan mengekspor satu sheet untuk seluruh batch FOM-157 sampai FOM-163', async () => {
    const codes = ['CCI-KAL-FOM-157', 'CCI-KAL-FOM-160', 'CCI-KAL-FOM-161', 'CCI-KAL-FOM-162', 'CCI-KAL-FOM-163'];
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'certindo-batch-'));

    try {
      for (const code of codes) {
        const form = instrumentForms.find((item) => item.code === code);
        expect(form?.cellMappings, `${code} harus memiliki mapping`).toBeDefined();
        const cells = Object.fromEntries(
          Object.values(form?.cellMappings ?? {}).flat().map((cell) => [cell, `QA-${code}-${cell}`]),
        );
        const outputPath = join(temporaryDirectory, `${code}.xlsx`);
        try {
          await new OoxmlWorkbookService().fillTemplate(
            resolve(process.cwd(), '..', '..', form?.workbook ?? currentWorkbookPath),
            outputPath,
            form?.sheet ?? '',
            cells,
          );
        } catch (error) {
          throw new Error(`${code}: ${error instanceof Error ? error.message : String(error)}`);
        }
        const zip = await JSZip.loadAsync(await readFile(outputPath));
        await expectSingleWorksheet(zip, form?.sheet ?? '');
      }
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('mengekspor FOM-096 dengan satu maupun lebih banyak baris daripada template', async () => {
    const form = instrumentForms.find((item) => item.code === 'CCI-KAL-FOM-096');
    expect(form).toBeDefined();
    const tables = getWorksheetTableMappings(form!);
    expect(tables).toHaveLength(2);
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'certindo-dynamic-rows-'));

    try {
      const cases = [
        {
          name: 'shrink', counts: [1, 1],
          cells: { B25: 'NOMINAL-1', B43: 'REPEAT-1', J46: 'SUPPORT-SHIFTED-UP' },
        },
        {
          name: 'grow', counts: [4, 3],
          cells: {
            B25: 'NOMINAL-1', B26: 'NOMINAL-2', B27: 'NOMINAL-3', B28: 'NOMINAL-4',
            B46: 'REPEAT-1', B47: 'REPEAT-2', B48: 'REPEAT-3', J51: 'SUPPORT-SHIFTED-DOWN',
          },
        },
      ];

      for (const testCase of cases) {
        const outputPath = join(temporaryDirectory, `${testCase.name}.xlsx`);
        await new OoxmlWorkbookService().fillTemplate(
          resolve(process.cwd(), '..', '..', form!.workbook ?? currentWorkbookPath),
          outputPath,
          form!.sheet,
          testCase.cells,
          tables.map((table, index) => ({ ...table, rowCount: testCase.counts[index] ?? 1 })),
        );
        const zip = await JSZip.loadAsync(await readFile(outputPath));
        await expectSingleWorksheet(zip, form!.sheet);
        const worksheet = Object.values(zip.files).find((file) => /^xl\/worksheets\/sheet\d+\.xml$/.test(file.name));
        const xml = await worksheet!.async('string');
        for (const marker of Object.values(testCase.cells)) expect(xml).toContain(marker);
      }
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('mengisi mapping identitas dan mengekspor satu sheet untuk seluruh katalog instrumen', async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'certindo-catalog-'));

    try {
      for (const form of instrumentForms) {
        const mappings = getInstrumentCellMappings(form);
        expect(Object.keys(mappings).length, `${form.code} harus memiliki mapping`).toBeGreaterThan(0);
        const staticEntries = Object.entries(mappings).filter(([key]) => !key.startsWith('measurements.tables.'));
        const cells = Object.fromEntries(
          staticEntries.flatMap(([, targets]) => targets).map((cell) => [cell, `CATALOG-QA-${cell}`]),
        );
        const outputPath = join(temporaryDirectory, `${form.code}.xlsx`);

        try {
          await new OoxmlWorkbookService().fillTemplate(
            resolve(process.cwd(), '..', '..', form.workbook ?? currentWorkbookPath),
            outputPath,
            form.sheet,
            cells,
          );
        } catch (error) {
          throw new Error(`${form.code}: ${error instanceof Error ? error.message : String(error)}`);
        }

        const zip = await JSZip.loadAsync(await readFile(outputPath));
        await expectSingleWorksheet(zip, form.sheet);
        const worksheet = Object.values(zip.files).find((file) => /^xl\/worksheets\/sheet\d+\.xml$/.test(file.name));
        expect(worksheet, `${form.code} harus menyisakan satu worksheet`).toBeDefined();
        const worksheetXml = await worksheet!.async('string');
        for (const cell of staticEntries.flatMap(([, targets]) => targets)) {
          expect(worksheetXml, `${form.code} gagal mengisi ${cell}`).toContain(`CATALOG-QA-${cell}`);
        }
      }
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }, 120_000);
});
