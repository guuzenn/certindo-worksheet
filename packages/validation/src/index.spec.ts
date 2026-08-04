import { describe, expect, it } from 'vitest';
import { loginSchema } from './index';

describe('loginSchema', () => {
  it('menormalkan email pengguna', () => {
    expect(loginSchema.parse({ email: 'ADMIN@CERTINDO.CO.ID', password: 'Rahasia123!' }).email).toBe(
      'admin@certindo.co.id',
    );
  });

  it('menolak kata sandi pendek', () => {
    expect(loginSchema.safeParse({ email: 'admin@certindo.co.id', password: '123' }).success).toBe(false);
  });
});
