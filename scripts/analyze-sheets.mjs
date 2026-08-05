/**
 * Analyze all sheets in both workbooks to extract cell layouts for measurement tables.
 * Uses JSZip (already available in the project) to read the OOXML structure.
 */
import JSZip from 'jszip';
import { readFile, writeFile } from 'node:fs/promises';

function unescapeXml(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function listWorkbookSheets(workbookXml) {
  const sheets = [];
  const pattern = /<sheet\b(?=[^>]*\bname="([^"]+)")(?=[^>]*\br:id="([^"]+)")[^>]*\/>/gi;
  for (const match of workbookXml.matchAll(pattern)) {
    if (match[0] && match[1] && match[2]) {
      sheets.push({ index: sheets.length, name: unescapeXml(match[1]), relationshipId: match[2] });
    }
  }
  return sheets;
}

function findSheetPath(workbookXml, relationshipsXml, sheetName) {
  const escapedName = sheetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sheetMatch = workbookXml.match(
    new RegExp(`<sheet\\b(?=[^>]*\\bname="${escapedName}")(?=[^>]*\\br:id="([^"]+)")[^>]*/?>`, 'i'),
  );
  if (!sheetMatch?.[1]) return null;
  const relId = sheetMatch[1];
  const escapedRelId = relId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const relMatch = relationshipsXml.match(
    new RegExp(`<Relationship\\b(?=[^>]*\\bId="${escapedRelId}")(?=[^>]*\\bTarget="([^"]+)")[^>]*/?>`, 'i'),
  );
  if (!relMatch?.[1]) return null;
  const target = relMatch[1].replaceAll('\\', '/').replace(/^\//, '');
  return target.startsWith('xl/') ? target : `xl/${target.replace(/^\.\//, '')}`;
}

function extractSheetCells(sheetXml) {
  const rows = [];
  const rowPattern = /<row\b(?=[^>]*\br="(\d+)")[^>]*>([\s\S]*?)<\/row>/gi;
  for (const rowMatch of sheetXml.matchAll(rowPattern)) {
    const rowNumber = parseInt(rowMatch[1], 10);
    const cells = [];
    // Match paired cells <c ...>...</c> and self-closing <c .../> 
    const cellPattern = /<c\b(?=[^>]*\br="([^"]+)")[^>]*(?:>([\s\S]*?)<\/c>|\/>)/gi;
    for (const cellMatch of rowMatch[2].matchAll(cellPattern)) {
      const ref = cellMatch[1];
      const innerXml = cellMatch[2] ?? '';
      // Extract value from <v> tag or <t> within <is>
      let value = '';
      const vMatch = innerXml.match(/<v[^>]*>([\s\S]*?)<\/v>/i);
      if (vMatch) value = unescapeXml(vMatch[1]);
      const tMatch = innerXml.match(/<t[^>]*>([\s\S]*?)<\/t>/i);
      if (tMatch) value = unescapeXml(tMatch[1]);
      cells.push({ ref, value });
    }
    rows.push({ rowNumber, cells });
  }
  return rows;
}

function extractSharedStrings(zip) {
  const file = zip.file('xl/sharedStrings.xml');
  if (!file) return [];
  return file.async('string').then(xml => {
    const strings = [];
    // Match each <si> element and extract text from <t> tags within
    const siPattern = /<si[^>]*>([\s\S]*?)<\/si>/gi;
    for (const siMatch of xml.matchAll(siPattern)) {
      const tPattern = /<t[^>]*>([\s\S]*?)<\/t>/gi;
      let text = '';
      for (const tMatch of siMatch[1].matchAll(tPattern)) {
        text += unescapeXml(tMatch[1]);
      }
      strings.push(text);
    }
    return strings;
  });
}

function resolveValues(rows, sharedStrings) {
  return rows.map(row => ({
    rowNumber: row.rowNumber,
    cells: row.cells.map(cell => {
      // Check if cell type is shared string
      const isSharedString = cell.value && /^\d+$/.test(cell.value);
      const ssIndex = parseInt(cell.value, 10);
      // We can't reliably check from the regex alone, so we try shared string lookup
      return {
        ref: cell.ref,
        value: cell.value,
        resolvedValue: isSharedString && sharedStrings[ssIndex] !== undefined ? sharedStrings[ssIndex] : cell.value,
      };
    }),
  }));
}

async function analyzeWorkbook(filePath, label) {
  const buffer = await readFile(filePath);
  const zip = await JSZip.loadAsync(buffer);

  const workbookFile = zip.file('xl/workbook.xml');
  const relsFile = zip.file('xl/_rels/workbook.xml.rels');
  if (!workbookFile || !relsFile) {
    console.error(`Invalid workbook: ${filePath}`);
    return {};
  }

  const workbookXml = await workbookFile.async('string');
  const relsXml = await relsFile.async('string');
  const sheets = listWorkbookSheets(workbookXml);
  const sharedStrings = await extractSharedStrings(zip);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`WORKBOOK: ${label} (${filePath})`);
  console.log(`Shared strings count: ${sharedStrings.length}`);
  console.log(`Sheets: ${sheets.length}`);
  console.log('='.repeat(80));

  const result = {};

  for (const sheet of sheets) {
    const sheetPath = findSheetPath(workbookXml, relsXml, sheet.name);
    if (!sheetPath) {
      console.log(`\n  [SKIP] ${sheet.name} - no path found`);
      continue;
    }
    const sheetFile = zip.file(sheetPath);
    if (!sheetFile) {
      console.log(`\n  [SKIP] ${sheet.name} - file not found at ${sheetPath}`);
      continue;
    }
    const sheetXml = await sheetFile.async('string');
    const rawRows = extractSheetCells(sheetXml);
    const rows = resolveValues(rawRows, sharedStrings);

    // We need to understand cell types better - check original XML for type attribute
    const cellTypePattern = /<c\b(?=[^>]*\br="([^"]+)")([^>]*)(?:>([\s\S]*?)<\/c>|\/>)/gi;
    const cellTypes = {};
    for (const m of sheetXml.matchAll(cellTypePattern)) {
      const ref = m[1];
      const attrs = m[2] ?? '';
      const typeMatch = attrs.match(/\bt="([^"]+)"/i);
      cellTypes[ref] = typeMatch ? typeMatch[1] : 'n'; // default numeric
    }

    // Now resolve properly: 's' type = shared string
    const resolvedRows = rows.map(row => ({
      rowNumber: row.rowNumber,
      cells: row.cells.map(cell => {
        const cellType = cellTypes[cell.ref];
        let displayValue = cell.value;
        if (cellType === 's' && /^\d+$/.test(cell.value)) {
          const idx = parseInt(cell.value, 10);
          displayValue = sharedStrings[idx] ?? cell.value;
        } else if (cellType === 'inlineStr') {
          displayValue = cell.resolvedValue;
        }
        return { ref: cell.ref, value: displayValue };
      }),
    }));

    const maxRow = resolvedRows.length > 0 ? Math.max(...resolvedRows.map(r => r.rowNumber)) : 0;
    const allCells = resolvedRows.flatMap(r => r.cells);
    const nonEmptyCells = allCells.filter(c => c.value && c.value.trim());

    result[sheet.name] = resolvedRows;

    console.log(`\n--- Sheet: "${sheet.name}" (${resolvedRows.length} rows, max row ${maxRow}, ${nonEmptyCells.length} non-empty cells) ---`);

    // Print first 60 rows with content for analysis
    for (const row of resolvedRows) {
      if (row.rowNumber > 60) break;
      const cellStrs = row.cells
        .filter(c => c.value && c.value.trim())
        .map(c => `${c.ref}=${JSON.stringify(c.value.trim().substring(0, 60))}`);
      if (cellStrs.length > 0) {
        console.log(`  Row ${row.rowNumber}: ${cellStrs.join(' | ')}`);
      }
    }
  }

  return result;
}

async function main() {
  const early = await analyzeWorkbook('storage/templates/Lembar Kerja 0X-94.xlsx', '0X-94');
  const current = await analyzeWorkbook('storage/templates/Lembar Kerja 095-163.xlsx', '095-163');

  // Save full analysis to JSON for reference
  const output = { early, current };
  await writeFile('scripts/sheet-analysis.json', JSON.stringify(output, null, 2));
  console.log('\nFull analysis saved to scripts/sheet-analysis.json');
}

main().catch(console.error);
