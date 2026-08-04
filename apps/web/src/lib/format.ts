export function formatIndonesianDate(value: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value));
}
