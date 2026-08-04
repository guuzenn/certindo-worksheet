import type { CalibrationOptions } from '@certindo/types';

type InstrumentFormOption = CalibrationOptions['instrumentForms'][number];

function instrumentFormNumber(code: string): number {
  const match = code.match(/FOM-(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

export function sortInstrumentForms(options: InstrumentFormOption[]): InstrumentFormOption[] {
  return [...options].sort((left, right) => {
    const numberDifference = instrumentFormNumber(left.code) - instrumentFormNumber(right.code);
    return numberDifference
      || left.code.localeCompare(right.code, 'id', { numeric: true })
      || left.name.localeCompare(right.name, 'id');
  });
}
