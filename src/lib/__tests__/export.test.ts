/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock papaparse
vi.mock('papaparse', () => ({
  default: {
    unparse: vi.fn((data: unknown) => {
      if (Array.isArray(data)) {
        return data.map((row: Record<string, unknown>) => Object.values(row).join(',')).join('\n');
      }
      if (
        typeof data === 'object' &&
        data !== null &&
        'fields' in data &&
        'data' in data &&
        Array.isArray(data.fields) &&
        Array.isArray(data.data)
      ) {
        const headers = data.fields.join(',');
        const rows = data.data.map((row: unknown[]) => row.join(',')).join('\n');
        return `${headers}\n${rows}`;
      }
      return '';
    }),
  },
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock');
const mockRevokeObjectURL = vi.fn();
Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL });
Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL });

// Mock document.createElement
const mockClick = vi.fn();
const mockLink = {
  href: '',
  download: '',
  click: mockClick,
};
const nativeCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'a') return mockLink as unknown as HTMLAnchorElement;
  return nativeCreateElement(tag);
});

describe('exportToCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is defined', async () => {
    const { exportToCSV } = await import('@/lib/utils/export');
    expect(exportToCSV).toBeDefined();
  });

  it('handles empty data with toast', async () => {
    const { exportToCSV } = await import('@/lib/utils/export');
    const { toast } = await import('sonner');
    exportToCSV([], 'test');
    expect(toast.error).toHaveBeenCalledWith('ไม่มีข้อมูลสำหรับส่งออก');
  });
});

describe('triggerPrint', () => {
  it('calls window.print', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const { triggerPrint } = await import('@/lib/utils/export');
    triggerPrint();
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });
});
