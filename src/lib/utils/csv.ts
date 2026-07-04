import Papa from 'papaparse';
import {
  REQUIRED_STUDENT_ENGLISH_CSV_HEADERS,
  REQUIRED_STUDENT_THAI_CSV_HEADERS,
  STUDENT_CSV_HEADERS,
  readCsvString,
  readCsvValue,
} from '@/lib/domain/csv';

export interface CsvImportResult {
  success: number;
  errors: { row: number; message: string }[];
  data: Record<string, unknown>[];
}

/**
 * Parse CSV file with validation
 */
export function parseCsvFile(
  file: File,
  options?: {
    header?: boolean;
    skipEmptyLines?: boolean;
    transformHeader?: (header: string) => string;
  }
): Promise<CsvImportResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: options?.header !== false,
      skipEmptyLines: options?.skipEmptyLines !== false,
      transformHeader: (header) => {
        if (options?.transformHeader) return options.transformHeader(header);
        return header.trim();
      },
      complete: (results) => {
        const errors: { row: number; message: string }[] = [];
        results.errors.forEach(err => {
          errors.push({
            row: (err.row ?? 0) + 1,
            message: err.message,
          });
        });

        resolve({
          success: results.data.length - results.errors.length,
          errors,
          data: results.data as Record<string, unknown>[],
        });
      },
      error: (error) => {
        reject(new Error(error.message));
      },
    });
  });
}

/**
 * Export data as CSV and trigger download
 */
export function exportCsv(
  data: Record<string, unknown>[],
  filename: string,
  columns?: { key: string; label: string }[]
) {
  let csv: string;

  if (columns) {
    const headers = columns.map(c => c.label);
    const rows = data.map(row =>
      columns.map(c => {
        const value = row[c.key];
        if (value === null || value === undefined) return '';
        return String(value);
      })
    );
    csv = Papa.unparse({
      fields: headers,
      data: rows,
    });
  } else {
    csv = Papa.unparse(data);
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Map CSV row to student import format
 */
export function mapCsvRowToStudent(row: Record<string, unknown>) {
  return {
    academic_year: readCsvString(row, STUDENT_CSV_HEADERS.academicYear),
    student_id: readCsvString(row, STUDENT_CSV_HEADERS.studentId),
    prefix: readCsvString(row, STUDENT_CSV_HEADERS.prefix),
    class_number: Number(readCsvValue(row, STUDENT_CSV_HEADERS.classNumber) ?? 0),
    first_name: readCsvString(row, STUDENT_CSV_HEADERS.firstName),
    last_name: readCsvString(row, STUDENT_CSV_HEADERS.lastName),
    education_stage_id: readCsvString(row, STUDENT_CSV_HEADERS.educationStage),
    grade_level: Number(readCsvValue(row, STUDENT_CSV_HEADERS.gradeLevel) ?? 1),
    classroom: readCsvString(row, STUDENT_CSV_HEADERS.classroom),
    status: readCsvString(row, STUDENT_CSV_HEADERS.status, 'active'),
    guardian_full_name: readCsvString(row, STUDENT_CSV_HEADERS.guardianFullName),
    guardian_relation: readCsvString(row, STUDENT_CSV_HEADERS.guardianRelation),
    guardian_phone: readCsvString(row, STUDENT_CSV_HEADERS.guardianPhone),
  };
}

/**
 * Validate CSV headers for student import
 */
export function validateCsvHeaders(headers: string[]): string[] {
  const missing: string[] = [];
  const hasThai = REQUIRED_STUDENT_THAI_CSV_HEADERS.some(h => headers.includes(h));
  const hasEng = REQUIRED_STUDENT_ENGLISH_CSV_HEADERS.some(h => headers.includes(h));

  if (!hasThai && !hasEng) {
    return [...REQUIRED_STUDENT_THAI_CSV_HEADERS];
  }

  return missing;
}
