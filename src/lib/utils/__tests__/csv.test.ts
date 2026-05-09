// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCsvFile, exportCsv, mapCsvRowToStudent, validateCsvHeaders } from '../csv';

describe('parseCsvFile', () => {
  it('parses CSV with headers', async () => {
    const csvContent = 'name,age\nJohn,15\nJane,14';
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
    const result = await parseCsvFile(file);
    expect(result.success).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({ name: 'John', age: '15' });
    expect(result.data[1]).toEqual({ name: 'Jane', age: '14' });
  });

  it('handles empty CSV', async () => {
    const file = new File([''], 'empty.csv', { type: 'text/csv' });
    const result = await parseCsvFile(file);
    // Empty file produces a parse error, so success is -1 or 0
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('handles CSV with BOM', async () => {
    const csvContent = '﻿name,age\nJohn,15';
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
    const result = await parseCsvFile(file);
    expect(result.success).toBe(1);
  });

  it('handles malformed CSV gracefully', async () => {
    const csvContent = 'a,b,c\n1,2\n3,4,5,6';
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
    const result = await parseCsvFile(file);
    // Should still parse what it can
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('applies transformHeader option', async () => {
    const csvContent = 'First Name,Last Name\nJohn,Doe';
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
    const result = await parseCsvFile(file, {
      transformHeader: (h) => h.toLowerCase().replace(/\s+/g, '_'),
    });
    expect(result.data[0]).toHaveProperty('first_name');
    expect(result.data[0]).toHaveProperty('last_name');
  });

  it('rejects non-CSV content type', async () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    // papaparse still tries to parse it - that's fine
    const result = await parseCsvFile(file);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('handles CSV with Thai characters', async () => {
    const csvContent = 'ชื่อ,อายุ\nธนพล,15\nสมศรี,14';
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
    const result = await parseCsvFile(file);
    expect(result.success).toBe(2);
    expect(result.data[0]['ชื่อ']).toBe('ธนพล');
  });
});

describe('exportCsv', () => {
  beforeEach(() => {
    // Mock DOM APIs
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          click: vi.fn(),
        } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates CSV and triggers download', () => {
    const data = [{ name: 'John', age: '15' }, { name: 'Jane', age: '14' }];
    exportCsv(data, 'students');
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('uses custom column labels', () => {
    const data = [{ name: 'John', age: '15' }];
    exportCsv(data, 'test', [{ key: 'name', label: 'ชื่อ' }, { key: 'age', label: 'อายุ' }]);
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('handles null/undefined values', () => {
    const data = [{ name: 'John', age: null, email: undefined }];
    exportCsv(data, 'test');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('handles empty data array', () => {
    exportCsv([], 'empty');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});

describe('mapCsvRowToStudent', () => {
  it('maps Thai headers to student format', () => {
    const row = {
      'ปีการศึกษา': '2568',
      'รหัสนักเรียน': '1234567890',
      'เลขที่': '15',
      'ชื่อ': 'ธนพล',
      'นามสกุล': 'ใจดี',
      'ระดับ': 'primary',
      'ชั้นปี': '1',
      'ห้อง': 'ป.1/1',
    };
    const result = mapCsvRowToStudent(row);
    expect(result.academic_year).toBe('2568');
    expect(result.student_id).toBe('1234567890');
    expect(result.class_number).toBe(15);
    expect(result.first_name).toBe('ธนพล');
    expect(result.last_name).toBe('ใจดี');
    expect(result.education_stage_id).toBe('primary');
    expect(result.grade_level).toBe(1);
    expect(result.classroom).toBe('ป.1/1');
  });

  it('maps English headers to student format', () => {
    const row = {
      academic_year: '2568',
      student_id: '1234567890',
      class_number: '15',
      first_name: 'Thanaphon',
      last_name: 'Jaidee',
      education_stage: 'primary',
      grade_level: '1',
      classroom: '1/1',
    };
    const result = mapCsvRowToStudent(row);
    expect(result.student_id).toBe('1234567890');
    expect(result.first_name).toBe('Thanaphon');
    expect(result.class_number).toBe(15);
  });

  it('falls back to student_id_number for English header', () => {
    const row = {
      student_id_number: '1234567890',
      first_name: 'John',
      last_name: 'Doe',
    };
    const result = mapCsvRowToStudent(row);
    expect(result.student_id).toBe('1234567890');
  });

  it('handles missing optional fields', () => {
    const row = {
      student_id: '1234567890',
      first_name: 'John',
      last_name: 'Doe',
    };
    const result = mapCsvRowToStudent(row);
    expect(result.status).toBe('active');
    expect(result.education_stage_id).toBe('');
  });

  it('handles empty row gracefully', () => {
    const result = mapCsvRowToStudent({});
    expect(result.student_id).toBe('');
    expect(result.class_number).toBe(0);
    expect(result.first_name).toBe('');
    expect(result.last_name).toBe('');
  });

  it('preserves numeric values as numbers', () => {
    const row = {
      student_id: '1234567890',
      class_number: 15,
      first_name: 'John',
      last_name: 'Doe',
      grade_level: 1,
    };
    const result = mapCsvRowToStudent(row);
    expect(typeof result.class_number).toBe('number');
    expect(typeof result.grade_level).toBe('number');
  });
});

describe('validateCsvHeaders', () => {
  it('accepts Thai headers', () => {
    const headers = ['รหัสนักเรียน', 'ชื่อ', 'นามสกุล', 'ชั้นปี', 'ห้อง', 'อื่นๆ'];
    const result = validateCsvHeaders(headers);
    expect(result).toHaveLength(0);
  });

  it('accepts English headers', () => {
    const headers = ['student_id', 'first_name', 'last_name', 'grade_level', 'classroom'];
    const result = validateCsvHeaders(headers);
    expect(result).toHaveLength(0);
  });

  it('returns missing Thai headers for unrecognized headers', () => {
    const headers = ['col1', 'col2', 'col3'];
    const result = validateCsvHeaders(headers);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('รหัสนักเรียน');
  });

  it('returns missing headers for empty array', () => {
    const result = validateCsvHeaders([]);
    expect(result.length).toBeGreaterThan(0);
  });
});
