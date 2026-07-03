import Papa from 'papaparse';
import { toast } from 'sonner';

/**
 * Export data to CSV with BOM for Thai character support in Excel
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns?: { key: string; label: string }[],
) {
  if (data.length === 0) {
    toast.error('ไม่มีข้อมูลสำหรับส่งออก');
    return;
  }

  let csv: string;

  if (columns) {
    const headers = columns.map((c) => c.label);
    const rows = data.map((row) =>
      columns.map((c) => {
        const value = row[c.key];
        if (value === null || value === undefined) return '';
        return String(value);
      }),
    );
    csv = Papa.unparse({ fields: headers, data: rows });
  } else {
    csv = Papa.unparse(data);
  }

  // Add BOM so Excel opens Thai characters correctly
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);

  toast.success('ส่งออก CSV สำเร็จ');
}

/**
 * Trigger browser print dialog for PDF export.
 * Applies a temporary print-ready class so @media print rules kick in cleanly.
 */
export function triggerPrint() {
  window.print();
}
