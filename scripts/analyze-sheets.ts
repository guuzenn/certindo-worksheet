/**
 * Improved sheet analysis - dumps shared strings + properly resolves all cells.
 * Run with: npx tsx scripts/analyze-sheets.ts
 */
import JSZip from 'jszip';
import { readFile, writeFile } from 'node:fs/promises';

function unescapeXml(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

async function extractSharedStrings(zip: JSZip): Promise<string[]> {
  const file = zip.file('xl/sharedStrings.xml');
  if (!file) return [];
  const xml = await file.async('string');
  const strings: string[] = [];
  const siPattern = /<si[^>]*>([\s\S]*?)<\/si>/gi;
  for (const siMatch of xml.matchAll(siPattern)) {
    const tPattern = /<t[^>]*>([\s\S]*?)<\/t>/gi;
    let text = '';
    for (const tMatch of siMatch[1]!.matchAll(tPattern)) {
      text += unescapeXml(tMatch[1]!);
    }
    strings.push(text);
  }
  return strings;
}

function listWorkbookSheets(workbookXml: string) {
  const sheets: Array<{ index: number; name: string; relationshipId: string }> = [];
  const pattern = /<sheet\b(?=[^>]*\bname="([^"]+)")(?=[^>]*\br:id="([^"]+)")[^>]*\/>/gi;
  for (const match of workbookXml.matchAll(pattern)) {
    if (match[0] && match[1] && match[2]) {
      sheets.push({ index: sheets.length, name: unescapeXml(match[1]), relationshipId: match[2] });
    }
  }
  return sheets;
}

function findSheetPath(workbookXml: string, relsXml: string, sheetName: string): string | null {
  const escapedName = sheetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sheetMatch = workbookXml.match(
    new RegExp(`<sheet\\b(?=[^>]*\\bname="${escapedName}")(?=[^>]*\\br:id="([^"]+)")[^>]*/?>`, 'i'),
  );
  if (!sheetMatch?.[1]) return null;
  const relId = sheetMatch[1];
  const escapedRelId = relId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const relMatch = relsXml.match(
    new RegExp(`<Relationship\\b(?=[^>]*\\bId="${escapedRelId}")(?=[^>]*\\bTarget="([^"]+)")[^>]*/?>`, 'i'),
  );
  if (!relMatch?.[1]) return null;
  const target = relMatch[1].replaceAll('\\', '/').replace(/^\//, '');
  return target.startsWith('xl/') ? target : `xl/${target.replace(/^\.\//, '')}`;
}

interface CellInfo {
  ref: string;
  col: string;
  row: number;
  type: string;
  rawValue: string;
  displayValue: string;
}

function parseSheet(sheetXml: string, sharedStrings: string[]): CellInfo[] {
  const cells: CellInfo[] = [];
  // Match each <c> element (both paired and self-closing)
  const cellPattern = /<c\b([^>]*)(?:>([\s\S]*?)<\/c>|\/>)/gi;
  for (const cellMatch of sheetXml.matchAll(cellPattern)) {
    const attrs = cellMatch[1] ?? '';
    const inner = cellMatch[2] ?? '';
    
    const refMatch = attrs.match(/\br="([^"]+)"/i);
    if (!refMatch) continue;
    const ref = refMatch[1]!;
    const colMatch = ref.match(/^([A-Z]+)(\d+)$/i);
    if (!colMatch) continue;
    
    const col = colMatch[1]!.toUpperCase();
    const row = parseInt(colMatch[2]!, 10);
    
    const typeMatch = attrs.match(/\bt="([^"]+)"/i);
    const cellType = typeMatch ? typeMatch[1]! : '';
    
    // Extract raw value
    let rawValue = '';
    const vMatch = inner.match(/<v[^>]*>([\s\S]*?)<\/v>/i);
    if (vMatch) rawValue = unescapeXml(vMatch[1]!);
    
    // For inline strings
    const tMatches = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/gi)];
    if (tMatches.length > 0 && !vMatch) {
      rawValue = tMatches.map(m => unescapeXml(m[1]!)).join('');
    }
    
    // Resolve display value
    let displayValue = rawValue;
    if (cellType === 's' && rawValue) {
      const idx = parseInt(rawValue, 10);
      if (!isNaN(idx) && sharedStrings[idx] !== undefined) {
        displayValue = sharedStrings[idx]!;
      }
    } else if (cellType === 'inlineStr' && tMatches.length > 0) {
      displayValue = tMatches.map(m => unescapeXml(m[1]!)).join('');
    }
    
    cells.push({ ref, col, row, type: cellType, rawValue, displayValue });
  }
  return cells;
}

interface SheetAnalysis {
  name: string;
  rows: Map<number, CellInfo[]>;
  maxRow: number;
  nonEmptyCells: number;
}

async function analyzeWorkbook(filePath: string): Promise<Map<string, SheetAnalysis>> {
  const buffer = await readFile(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const workbookFile = zip.file('xl/workbook.xml');
  const relsFile = zip.file('xl/_rels/workbook.xml.rels');
  if (!workbookFile || !relsFile) throw new Error(`Invalid workbook: ${filePath}`);
  
  const workbookXml = await workbookFile.async('string');
  const relsXml = await relsFile.async('string');
  const sheets = listWorkbookSheets(workbookXml);
  const sharedStrings = await extractSharedStrings(zip);
  
  const result = new Map<string, SheetAnalysis>();
  
  for (const sheet of sheets) {
    const sheetPath = findSheetPath(workbookXml, relsXml, sheet.name);
    if (!sheetPath) continue;
    const sheetFile = zip.file(sheetPath);
    if (!sheetFile) continue;
    const sheetXml = await sheetFile.async('string');
    const cells = parseSheet(sheetXml, sharedStrings);
    
    const rows = new Map<number, CellInfo[]>();
    let maxRow = 0;
    let nonEmpty = 0;
    for (const cell of cells) {
      if (!rows.has(cell.row)) rows.set(cell.row, []);
      rows.get(cell.row)!.push(cell);
      if (cell.row > maxRow) maxRow = cell.row;
      if (cell.displayValue.trim()) nonEmpty++;
    }
    
    result.set(sheet.name, { name: sheet.name, rows, maxRow, nonEmptyCells: nonEmpty });
  }
  return result;
}

function printSheet(analysis: SheetAnalysis, output: string[]): void {
  output.push(`\n--- Sheet: "${analysis.name}" (max row ${analysis.maxRow}, ${analysis.nonEmptyCells} non-empty cells) ---`);
  const sortedRows = [...analysis.rows.keys()].sort((a, b) => a - b);
  for (const rowNum of sortedRows) {
    const cells = analysis.rows.get(rowNum)!;
    const cellStrs = cells
      .filter(c => c.displayValue.trim())
      .sort((a, b) => a.col.localeCompare(b.col))
      .map(c => {
        const val = c.displayValue.trim().replace(/\r?\n/g, '\\n').substring(0, 80);
        return `${c.ref}="${val}"`;
      });
    if (cellStrs.length > 0) {
      output.push(`  Row ${rowNum}: ${cellStrs.join(' | ')}`);
    }
  }
}

async function main() {
  const output: string[] = [];
  
  output.push('='.repeat(100));
  output.push('WORKBOOK: 0X-94');
  output.push('='.repeat(100));
  const early = await analyzeWorkbook('storage/templates/Lembar Kerja 0X-94.xlsx');
  for (const [, analysis] of early) printSheet(analysis, output);
  
  output.push('\n' + '='.repeat(100));
  output.push('WORKBOOK: 095-163');
  output.push('='.repeat(100));
  const current = await analyzeWorkbook('storage/templates/Lembar Kerja 095-163.xlsx');
  for (const [, analysis] of current) printSheet(analysis, output);
  
  await writeFile('scripts/sheet-analysis-v2.txt', output.join('\n'), 'utf-8');
  console.log(`Analysis complete. ${output.length} lines written to scripts/sheet-analysis-v2.txt`);
}

main().catch(console.error);
