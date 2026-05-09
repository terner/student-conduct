import Papa from 'papaparse';

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
    academic_year: String(row['ปีการศึกษา'] || row['academic_year'] || ''),
    student_id: String(row['รหัสนักเรียน'] || row['student_id'] || row['student_id_number'] || ''),
    prefix: String(row['คำนำหน้า'] || row['prefix'] || ''),
    class_number: Number(row['เลขที่ในห้อง'] || row['เลขที่'] || row['class_number'] || 0),
    first_name: String(row['ชื่อ'] || row['first_name'] || ''),
    last_name: String(row['นามสกุล'] || row['last_name'] || ''),
    education_stage: String(row['ระดับ'] || row['education_stage'] || 'primary'),
    grade_level: Number(row['ชั้นปี'] || row['grade_level'] || 1),
    classroom: String(row['ห้อง'] || row['classroom'] || ''),
    status: String(row['สถานะ'] || row['status'] || 'active'),
  };
}

/**
 * Validate CSV headers for student import
 */
export function validateCsvHeaders(headers: string[]): string[] {
  const requiredThaiHeaders = ['รหัสนักเรียน', 'ชื่อ', 'นามสกุล', 'ชั้นปี', 'ห้อง'];
  const requiredEngHeaders = ['student_id', 'first_name', 'last_name', 'grade_level', 'classroom'];

  const missing: string[] = [];
  const hasThai = requiredThaiHeaders.some(h => headers.includes(h));
  const hasEng = requiredEngHeaders.some(h => headers.includes(h));

  if (!hasThai && !hasEng) {
    return requiredThaiHeaders;
  }

  return missing;
}
