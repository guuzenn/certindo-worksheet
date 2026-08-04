import { Injectable, InternalServerErrorException } from '@nestjs/common';
import JSZip from 'jszip';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function unescapeXml(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

export function replaceCellValue(xml: string, cellReference: string, value: string): string {
  const escapedReference = cellReference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pairedCell = new RegExp(`<c\\b(?=[^>]*\\br="${escapedReference}")([^>]*)>[\\s\\S]*?<\\/c>`, 'i');
  const emptyCell = new RegExp(`<c\\b(?=[^>]*\\br="${escapedReference}")([^>]*)\\/>`, 'i');
  // Cek self-closing lebih dulu agar pola paired tidak melompati `/>` dan
  // memakan sel-sel kosong berikutnya sampai menemukan penutup `</c>` lain.
  const match = xml.match(emptyCell) ?? xml.match(pairedCell);
  if (!match) throw new InternalServerErrorException(`Sel mapping ${cellReference} tidak ditemukan pada template`);

  const attributes = (match[1] ?? '').replace(/\s+t="[^"]*"/gi, '').replace(/\/\s*$/, '');
  const replacement = `<c${attributes} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
  return xml.replace(match[0], replacement);
}

export interface WorksheetTableResize {
  firstRow: number;
  templateRowCount: number;
  rowCount: number;
}

function rowElementPattern(rowNumber: number): RegExp {
  return new RegExp(`<row\\b(?=[^>]*\\br="${rowNumber}")[^>]*>[\\s\\S]*?<\\/row>`, 'i');
}

function moveRowElement(rowXml: string, nextRow: number, clearValues = false): string {
  let moved = rowXml
    .replace(/(<row\b[^>]*\br=")\d+("[^>]*>)/i, `$1${nextRow}$2`)
    .replace(/(<c\b[^>]*\br="[A-Z]+)\d+("[^>]*>)/gi, `$1${nextRow}$2`)
    .replace(/(<c\b[^>]*\br="[A-Z]+)\d+("[^>]*\/>)/gi, `$1${nextRow}$2`);
  if (clearValues) {
    moved = moved.replace(/<c\b([^>]*)>[\s\S]*?<\/c>/gi, '<c$1/>');
  }
  return moved;
}

function shiftRowsAfter(xml: string, boundary: number, delta: number, inclusive = false): string {
  return xml.replace(/<row\b(?=[^>]*\br="(\d+)")[^>]*>[\s\S]*?<\/row>/gi, (rowXml, rawRow: string) => {
    const row = Number(rawRow);
    if (inclusive ? row < boundary : row <= boundary) return rowXml;
    return moveRowElement(rowXml, row + delta);
  });
}

function shiftReferenceRange(reference: string, boundary: number, delta: number, inclusive = false): string {
  return reference.replace(/(\$?[A-Z]{1,3}\$?)(\d+)/gi, (cell, column: string, rawRow: string) => {
    const row = Number(rawRow);
    if (inclusive ? row < boundary : row <= boundary) return cell;
    return `${column}${row + delta}`;
  });
}

function shiftWorksheetReferences(xml: string, boundary: number, delta: number, inclusive = false): string {
  const sheetDataMatch = xml.match(/<sheetData>[\s\S]*?<\/sheetData>/i);
  if (!sheetDataMatch) return xml;
  const shiftAttributes = (fragment: string) => fragment.replace(
    /\b(ref|sqref)="([^"]+)"/gi,
    (attribute, name: string, reference: string) => `${name}="${shiftReferenceRange(reference, boundary, delta, inclusive)}"`,
  );
  const index = sheetDataMatch.index ?? 0;
  const before = shiftAttributes(xml.slice(0, index));
  const afterIndex = index + sheetDataMatch[0].length;
  const after = shiftAttributes(xml.slice(afterIndex));
  return `${before}${sheetDataMatch[0]}${after}`;
}

function resizeWorksheetTable(xml: string, resize: WorksheetTableResize): string {
  const { firstRow, templateRowCount } = resize;
  const rowCount = Math.max(1, resize.rowCount);
  if (templateRowCount < 1 || rowCount === templateRowCount) return xml;
  const templateEnd = firstRow + templateRowCount - 1;
  const delta = rowCount - templateRowCount;

  if (delta < 0) {
    const sourceLast = xml.match(rowElementPattern(templateEnd))?.[0];
    const keptLast = firstRow + rowCount - 1;
    if (!sourceLast) throw new InternalServerErrorException(`Baris template ${templateEnd} tidak ditemukan`);
    xml = xml.replace(rowElementPattern(keptLast), moveRowElement(sourceLast, keptLast, true));
    for (let row = keptLast + 1; row <= templateEnd; row += 1) {
      xml = xml.replace(rowElementPattern(row), '');
    }
    xml = shiftRowsAfter(xml, templateEnd, delta);
    return shiftWorksheetReferences(xml, templateEnd, delta);
  }

  const sourceRowNumber = templateRowCount > 1 ? templateEnd - 1 : templateEnd;
  const sourceRow = xml.match(rowElementPattern(sourceRowNumber))?.[0];
  if (!sourceRow) throw new InternalServerErrorException(`Baris template ${sourceRowNumber} tidak ditemukan`);
  xml = shiftRowsAfter(xml, templateEnd, delta, true);
  const shiftedLastRow = templateEnd + delta;
  const insertedRows = Array.from(
    { length: delta },
    (_, index) => moveRowElement(sourceRow, templateEnd + index, true),
  ).join('');
  xml = xml.replace(rowElementPattern(shiftedLastRow), (lastRow) => `${insertedRows}${lastRow}`);
  return shiftWorksheetReferences(xml, templateEnd, delta, true);
}

export function resizeWorksheetTables(xml: string, tables: WorksheetTableResize[]): string {
  let offset = 0;
  for (const table of [...tables].sort((left, right) => left.firstRow - right.firstRow)) {
    const adjusted = { ...table, firstRow: table.firstRow + offset };
    xml = resizeWorksheetTable(xml, adjusted);
    offset += Math.max(1, table.rowCount) - table.templateRowCount;
  }
  return xml;
}

function findSheetPath(workbookXml: string, relationshipsXml: string, sheetName: string): string {
  const escapedName = escapeXml(sheetName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sheetMatch = workbookXml.match(
    new RegExp(`<sheet\\b(?=[^>]*\\bname="${escapedName}")(?=[^>]*\\br:id="([^"]+)")[^>]*/?>`, 'i'),
  );
  if (!sheetMatch) throw new InternalServerErrorException(`Sheet ${sheetName} tidak ditemukan pada template`);

  const relationshipId = sheetMatch[1];
  if (!relationshipId) throw new InternalServerErrorException(`ID relasi sheet ${sheetName} tidak ditemukan`);
  const escapedRelationshipId = relationshipId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const relationshipMatch = relationshipsXml.match(
    new RegExp(`<Relationship\\b(?=[^>]*\\bId="${escapedRelationshipId}")(?=[^>]*\\bTarget="([^"]+)")[^>]*/?>`, 'i'),
  );
  if (!relationshipMatch) throw new InternalServerErrorException(`Relasi sheet ${sheetName} tidak ditemukan`);

  const relationshipTarget = relationshipMatch[1];
  if (!relationshipTarget) throw new InternalServerErrorException(`Target relasi sheet ${sheetName} tidak ditemukan`);
  const target = relationshipTarget.replaceAll('\\', '/').replace(/^\//, '');
  return target.startsWith('xl/') ? target : `xl/${target.replace(/^\.\//, '')}`;
}

interface WorkbookSheet {
  index: number;
  name: string;
  relationshipId: string;
  tag: string;
}

function listWorkbookSheets(workbookXml: string): WorkbookSheet[] {
  const sheets: WorkbookSheet[] = [];
  const pattern = /<sheet\b(?=[^>]*\bname="([^"]+)")(?=[^>]*\br:id="([^"]+)")[^>]*\/>/gi;
  for (const match of workbookXml.matchAll(pattern)) {
    if (match[0] && match[1] && match[2]) {
      sheets.push({ index: sheets.length, name: unescapeXml(match[1]), relationshipId: match[2], tag: match[0] });
    }
  }
  return sheets;
}

function relationshipTarget(relationshipsXml: string, relationshipId: string): string | null {
  const escapedRelationshipId = relationshipId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = relationshipsXml.match(
    new RegExp(`<Relationship\\b(?=[^>]*\\bId="${escapedRelationshipId}")(?=[^>]*\\bTarget="([^"]+)")[^>]*/?>`, 'i'),
  );
  if (!match?.[1]) return null;
  const target = match[1].replaceAll('\\', '/').replace(/^\//, '');
  return target.startsWith('xl/') ? target : `xl/${target.replace(/^\.\//, '')}`;
}

function keepSelectedDefinedNames(workbookXml: string, selectedSheetIndex: number): string {
  return workbookXml.replace(/<definedNames>[\s\S]*?<\/definedNames>/i, (block) => {
    const selectedNames = [...block.matchAll(/<definedName\b[^>]*>[\s\S]*?<\/definedName>/gi)]
      .map((match) => match[0])
      .filter((definedName) => new RegExp(`\\blocalSheetId="${selectedSheetIndex}"`, 'i').test(definedName))
      .map((definedName) => definedName.replace(/\blocalSheetId="\d+"/i, 'localSheetId="0"'));
    return selectedNames.length ? `<definedNames>${selectedNames.join('')}</definedNames>` : '';
  });
}

function pruneToSelectedSheet(
  zip: JSZip,
  workbookXml: string,
  relationshipsXml: string,
  selectedSheetName: string,
): { workbookXml: string; relationshipsXml: string; removedWorksheetPaths: string[] } {
  const sheets = listWorkbookSheets(workbookXml);
  const selected = sheets.find((sheet) => sheet.name === selectedSheetName);
  if (!selected) throw new InternalServerErrorException(`Sheet ${selectedSheetName} tidak ditemukan pada template`);

  const removedWorksheetPaths: string[] = [];
  for (const sheet of sheets) {
    if (sheet.relationshipId === selected.relationshipId) continue;
    const path = relationshipTarget(relationshipsXml, sheet.relationshipId);
    if (!path) continue;
    removedWorksheetPaths.push(path);
    zip.remove(path);
    const fileName = path.split('/').at(-1);
    if (fileName) zip.remove(`xl/worksheets/_rels/${fileName}.rels`);
  }

  const selectedTag = selected.tag
    .replace(/\bsheetId="\d+"/i, 'sheetId="1"')
    .replace(/\s+state="(?:hidden|veryHidden)"/i, '');
  let nextWorkbookXml = workbookXml.replace(/<sheets>[\s\S]*?<\/sheets>/i, `<sheets>${selectedTag}</sheets>`);
  nextWorkbookXml = keepSelectedDefinedNames(nextWorkbookXml, selected.index)
    .replace(/\bactiveTab="\d+"/gi, 'activeTab="0"')
    .replace(/\bfirstSheet="\d+"/gi, 'firstSheet="0"');

  const nextRelationshipsXml = relationshipsXml.replace(/<Relationship\b[^>]*\/>/gi, (relationship) => {
    const id = relationship.match(/\bId="([^"]+)"/i)?.[1];
    const type = relationship.match(/\bType="([^"]+)"/i)?.[1] ?? '';
    if (type.endsWith('/worksheet') && id !== selected.relationshipId) return '';
    if (type.endsWith('/calcChain')) return '';
    return relationship;
  });

  zip.remove('xl/calcChain.xml');
  return { workbookXml: nextWorkbookXml, relationshipsXml: nextRelationshipsXml, removedWorksheetPaths };
}

@Injectable()
export class OoxmlWorkbookService {
  async fillTemplateBuffer(
    source: Buffer,
    sheetName: string,
    cells: Record<string, string>,
    tableResizes: WorksheetTableResize[] = [],
  ): Promise<Buffer> {
    const zip = await JSZip.loadAsync(source);
    const workbookFile = zip.file('xl/workbook.xml');
    const relationshipsFile = zip.file('xl/_rels/workbook.xml.rels');
    if (!workbookFile || !relationshipsFile) {
      throw new InternalServerErrorException('Struktur workbook template tidak valid');
    }

    const workbookXml = await workbookFile.async('string');
    const relationshipsXml = await relationshipsFile.async('string');
    const sheetPath = findSheetPath(workbookXml, relationshipsXml, sheetName);
    const sheetFile = zip.file(sheetPath);
    if (!sheetFile) throw new InternalServerErrorException(`File XML sheet ${sheetName} tidak ditemukan`);

    let sheetXml = resizeWorksheetTables(await sheetFile.async('string'), tableResizes);
    for (const [cellReference, value] of Object.entries(cells)) {
      sheetXml = replaceCellValue(sheetXml, cellReference, value);
    }
    zip.file(sheetPath, sheetXml, { createFolders: false });

    const pruned = pruneToSelectedSheet(zip, workbookXml, relationshipsXml, sheetName);
    zip.file('xl/workbook.xml', pruned.workbookXml, { createFolders: false });
    zip.file('xl/_rels/workbook.xml.rels', pruned.relationshipsXml, { createFolders: false });

    const contentTypesFile = zip.file('[Content_Types].xml');
    if (contentTypesFile) {
      const removedParts = new Set(pruned.removedWorksheetPaths.map((path) => `/${path}`));
      let contentTypesXml = await contentTypesFile.async('string');
      contentTypesXml = contentTypesXml.replace(/<Override\b[^>]*\/>/gi, (override) => {
        const partName = override.match(/\bPartName="([^"]+)"/i)?.[1];
        if (partName && (removedParts.has(partName) || partName === '/xl/calcChain.xml')) return '';
        return override;
      });
      zip.file('[Content_Types].xml', contentTypesXml, { createFolders: false });
    }

    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  async fillTemplate(
    templatePath: string,
    outputPath: string,
    sheetName: string,
    cells: Record<string, string>,
    tableResizes: WorksheetTableResize[] = [],
  ): Promise<void> {
    const output = await this.fillTemplateBuffer(
      await readFile(templatePath),
      sheetName,
      cells,
      tableResizes,
    );
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, output);
  }
}
