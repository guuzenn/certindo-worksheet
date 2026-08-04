import { describe, expect, it } from 'vitest';
import { HealthController } from '../src/health/health.controller';

describe('HealthController', () => {
  it('mengembalikan status ok', () => {
    expect(new HealthController().check()).toMatchObject({ status: 'ok', service: 'certindo-api' });
  });
});
