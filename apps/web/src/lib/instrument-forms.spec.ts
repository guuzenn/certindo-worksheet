import type { CalibrationOptions } from '@certindo/types';
import { describe, expect, it } from 'vitest';
import { sortInstrumentForms } from './instrument-forms';

const fields: CalibrationOptions['instrumentForms'][number]['fields'] = [];

describe('sortInstrumentForms', () => {
  it('mengurutkan template berdasarkan nomor FOM lalu variannya', () => {
    const options: CalibrationOptions['instrumentForms'] = [
      { id: '153', code: 'CCI-KAL-FOM-153', name: 'Dissolved Oxygen Meter', revision: '00', fields, additionalFields: [], measurementTables: [] },
      { id: '28b', code: 'CCI-KAL-FOM-028-B', name: 'Timbangan B', revision: '00', fields, additionalFields: [], measurementTables: [] },
      { id: '10', code: 'CCI-KAL-FOM-010', name: 'Pressure Gauge', revision: '00', fields, additionalFields: [], measurementTables: [] },
      { id: '28', code: 'CCI-KAL-FOM-028', name: 'Timbangan', revision: '00', fields, additionalFields: [], measurementTables: [] },
    ];

    expect(sortInstrumentForms(options).map((option) => option.id)).toEqual(['10', '28', '28b', '153']);
  });
});
