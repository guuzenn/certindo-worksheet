import {
  getMeasurementTableLeafColumns,
  isMeasurementTableLeafColumn,
  type MeasurementTableColumnDefinition,
  type MeasurementTableDefinition,
  type MeasurementTableLeafColumnDefinition,
} from '@certindo/types';

export interface MeasurementHeaderCell {
  id: string;
  label: string;
  colSpan: number;
  rowSpan: number;
  column?: MeasurementTableLeafColumnDefinition;
}

export function createMeasurementHeaderRows(
  columns: MeasurementTableColumnDefinition[],
): MeasurementHeaderCell[][] {
  const depth = Math.max(1, ...columns.map(columnDepth));
  const rows = Array.from({ length: depth }, () => [] as MeasurementHeaderCell[]);

  function visit(items: MeasurementTableColumnDefinition[], level: number, path: string): void {
    items.forEach((column, index) => {
      const id = `${path}.${index}`;
      if (isMeasurementTableLeafColumn(column)) {
        rows[level]!.push({
          id: `${id}.${column.key}`,
          label: column.label,
          colSpan: 1,
          rowSpan: depth - level,
          column,
        });
        return;
      }
      rows[level]!.push({
        id,
        label: column.label,
        colSpan: getMeasurementTableLeafColumns(column.children).length,
        rowSpan: 1,
      });
      visit(column.children, level + 1, id);
    });
  }

  visit(columns, 0, 'header');
  return rows;
}

export function measurementTableInitialRowCount(table: MeasurementTableDefinition): number {
  return table.initialRowCount ?? table.rowCount ?? 1;
}

export function measurementTableMinimumRowCount(table: MeasurementTableDefinition): number {
  return table.fixedRows
    ? measurementTableInitialRowCount(table)
    : (table.minRows ?? 1);
}

export function measurementTableMaximumRowCount(table: MeasurementTableDefinition): number | undefined {
  return table.fixedRows
    ? measurementTableInitialRowCount(table)
    : table.maxRows;
}

function columnDepth(column: MeasurementTableColumnDefinition): number {
  return isMeasurementTableLeafColumn(column)
    ? 1
    : 1 + Math.max(...column.children.map(columnDepth));
}
