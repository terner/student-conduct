'use client';

import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportButtonsProps {
  onExportCSV?: () => void;
  onPrint?: () => void;
  csvLabel?: string;
  printLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Reusable CSV + Print/PDF export buttons for report pages.
 *
 * - CSV: calls `onExportCSV` (should trigger file download)
 * - Print: calls `onPrint` or falls back to `window.print()`
 *
 * Both buttons are hidden when printing (`print:hidden`).
 */
export function ExportButtons({
  onExportCSV,
  onPrint,
  csvLabel = 'ส่งออก CSV',
  printLabel = 'พิมพ์ / PDF',
  disabled = false,
  className = '',
}: ExportButtonsProps) {
  function handlePrint() {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  }

  return (
    <div className={`flex gap-2 print:hidden ${className}`}>
      {onExportCSV && (
        <Button variant="outline" onClick={onExportCSV} disabled={disabled}>
          <Download className="mr-2 h-4 w-4" />
          {csvLabel}
        </Button>
      )}
      <Button variant="outline" onClick={handlePrint} disabled={disabled}>
        <Printer className="mr-2 h-4 w-4" />
        {printLabel}
      </Button>
    </div>
  );
}
