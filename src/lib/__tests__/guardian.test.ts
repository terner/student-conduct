import { describe, it, expect } from 'vitest';
import { buildGuardianFullName, parseGuardianFullName } from '@/lib/guardian';

describe('buildGuardianFullName', () => {
  it('builds full name from parts', () => {
    expect(buildGuardianFullName({
      guardian_prefix: 'นาย',
      guardian_first_name: 'สมชาย',
      guardian_last_name: 'ใจดี',
    })).toBe('นายสมชาย ใจดี');
  });

  it('handles missing prefix', () => {
    expect(buildGuardianFullName({
      guardian_first_name: 'สมชาย',
      guardian_last_name: 'ใจดี',
    })).toBe('สมชาย ใจดี');
  });

  it('handles missing last name', () => {
    expect(buildGuardianFullName({
      guardian_prefix: 'นาง',
      guardian_first_name: 'สมหญิง',
    })).toBe('นางสมหญิง');
  });

  it('returns empty when no parts', () => {
    expect(buildGuardianFullName({})).toBe('');
  });

  it('uses full_name fallback', () => {
    expect(buildGuardianFullName({
      guardian_full_name: 'นายสมชาย ใจดี',
    })).toBe('นายสมชาย ใจดี');
  });
});

describe('parseGuardianFullName', () => {
  it('parses name with known prefix', () => {
    const result = parseGuardianFullName('นายสมชาย ใจดี');
    expect(result.guardian_prefix).toBe('นาย');
    expect(result.guardian_first_name).toBe('สมชาย');
    expect(result.guardian_last_name).toBe('ใจดี');
  });

  it('parses name with นางสาว prefix', () => {
    const result = parseGuardianFullName('นางสาวสมหญิง ใจดี');
    expect(result.guardian_prefix).toBe('นางสาว');
    expect(result.guardian_first_name).toBe('สมหญิง');
    expect(result.guardian_last_name).toBe('ใจดี');
  });

  it('handles name without prefix', () => {
    const result = parseGuardianFullName('สมชาย ใจดี');
    expect(result.guardian_prefix).toBe('');
    expect(result.guardian_first_name).toBe('สมชาย');
    expect(result.guardian_last_name).toBe('ใจดี');
  });

  it('handles empty string', () => {
    const result = parseGuardianFullName('');
    expect(result.guardian_prefix).toBe('');
    expect(result.guardian_first_name).toBe('');
    expect(result.guardian_last_name).toBe('');
  });

  it('handles null', () => {
    const result = parseGuardianFullName(null);
    expect(result.guardian_prefix).toBe('');
    expect(result.guardian_first_name).toBe('');
    expect(result.guardian_last_name).toBe('');
  });

  it('handles single name with prefix', () => {
    const result = parseGuardianFullName('คุณสมชาย');
    expect(result.guardian_prefix).toBe('คุณ');
    expect(result.guardian_first_name).toBe('สมชาย');
    expect(result.guardian_last_name).toBe('');
  });
});
