import type { MeasurementTableDefinition } from '@certindo/types';
import { describe, expect, it } from 'vitest';
import {
  createMeasurementHeaderRows,
  measurementTableInitialRowCount,
  measurementTableMaximumRowCount,
  measurementTableMinimumRowCount,
} from './measurement-tables';

const generalTable: MeasurementTableDefinition = {
  id: 'measurements',
  title: 'Pengukuran',
  rowCount: 14,
  initialRowCount: 1,
  templateRowCount: 14,
  minRows: 1,
  maxRows: 14,
  layout: 'record-grid',
  preserveTemplateRows: true,
  columns: [
    { key: 'parameter', label: 'Parameter' },
    { label: 'UUT', children: [{ key: 'uut1', label: '1' }, { key: 'uut2', label: '2' }] },
    { label: 'STD', children: [{ key: 'std1', label: '1' }, { key: 'std2', label: '2' }] },
  ],
};

describe('measurement table V2', () => {
  it('membentuk header bertingkat dengan colspan dan rowspan yang benar', () => {
    const rows = createMeasurementHeaderRows(generalTable.columns);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.map(({ label, colSpan, rowSpan }) => ({ label, colSpan, rowSpan }))).toEqual([
      { label: 'Parameter', colSpan: 1, rowSpan: 2 },
      { label: 'UUT', colSpan: 2, rowSpan: 1 },
      { label: 'STD', colSpan: 2, rowSpan: 1 },
    ]);
    expect(rows[1]?.map((cell) => cell.column?.key)).toEqual(['uut1', 'uut2', 'std1', 'std2']);
  });

  it('memulai dari satu baris tanpa mengubah kapasitas baris workbook', () => {
    expect(measurementTableInitialRowCount(generalTable)).toBe(1);
    expect(measurementTableMinimumRowCount(generalTable)).toBe(1);
    expect(measurementTableMaximumRowCount(generalTable)).toBe(14);
  });
});
