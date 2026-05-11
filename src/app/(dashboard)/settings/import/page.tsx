'use client';

import { useEffect, useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle2, Download, FileSpreadsheet, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseCsvFile } from '@/lib/utils/csv';
import { importStudentsCsv } from '@/lib/actions/student.action';
import { getScoreRecordingAvailability } from '@/lib/actions/score.action';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';
import { useTranslations } from 'next-intl';

export default function ImportPage() {
  const settingsT = useTranslations('settings');
  const studentT = useTranslations('student');
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [previewErrors, setPreviewErrors] = useState<{ row: number; message: string }[]>([]);
  const [result, setResult] = useState<{ success: number; errors: { row: number; message: string }[] } | null>(null);
  const [selectedYearOpen, setSelectedYearOpen] = useState(false);
  const [closedReason, setClosedReason] = useState('');
  const previewColumns = previewRows[0] ? Object.keys(previewRows[0]).slice(0, 8) : [];

  function resetPreview() {
    setPreviewRows([]);
    setPreviewErrors([]);
  }

  useEffect(() => {
    if (!selectedAcademicYearId) {
      void Promise.resolve().then(() => {
        setSelectedYearOpen(false);
        setClosedReason(settingsT('selectAcademicYearRequired'));
      });
      return;
    }

    let cancelled = false;
    Promise.resolve()
      .then(() => getScoreRecordingAvailability(selectedAcademicYearId))
      .then((availability) => {
        if (cancelled) return;
        setSelectedYearOpen(Boolean(availability.success && availability.data?.can_record));
        setClosedReason(availability.success ? availability.data?.reason || '' : availability.error.message);
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedYearOpen(false);
          setClosedReason(settingsT('academicYearAvailabilityCheckFailed'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAcademicYearId, settingsT]);

  async function handlePreview() {
    if (!file || !selectedYearOpen) return;
    setPreviewing(true);
    setResult(null);
    resetPreview();

    try {
      const parsed = await parseCsvFile(file);
      setPreviewRows(parsed.data);
      setPreviewErrors(parsed.errors);
    } catch (err) {
      setResult({ success: 0, errors: [{ row: 0, message: err instanceof Error ? err.message : settingsT('csvReadFailed') }] });
    } finally {
      setPreviewing(false);
    }
  }

  async function handleImport() {
    if (!file || !selectedYearOpen || previewRows.length === 0) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await importStudentsCsv(previewRows);
      if (res.success) {
        setResult({
          success: res.data.imported,
          errors: [...previewErrors, ...res.data.errors],
        });
        resetPreview();
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setResult({ success: 0, errors: [{ row: 0, message: res.error?.message || settingsT('genericError') }] });
      }
    } catch (err) {
      setResult({ success: 0, errors: [{ row: 0, message: err instanceof Error ? err.message : settingsT('csvReadFailed') }] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{settingsT('importData')}</h1>
        <p className="text-muted-foreground mt-1">{settingsT('importDataDescription')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{settingsT('uploadCsv')}</CardTitle>
            <CardDescription>
              {selectedYearOpen
                ? settingsT('csvColumnsHelp')
                : settingsT('selectedYearImportClosed', {
                    reason: closedReason ? settingsT('reasonWithParens', { reason: closedReason }) : '',
                  })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${selectedYearOpen ? 'cursor-pointer hover:bg-accent' : 'cursor-not-allowed bg-muted/40 opacity-70'}`}
              onClick={() => {
                if (selectedYearOpen) fileInputRef.current?.click();
              }}
            >
              <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {file ? file.name : settingsT('chooseCsv')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : settingsT('csvFileHelp')}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                disabled={!selectedYearOpen}
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setResult(null);
                  resetPreview();
                }}
              />
            </div>

            <Button
              className="w-full"
              onClick={handlePreview}
              disabled={!file || previewing || loading || !selectedYearOpen}
            >
              {previewing ? (
                settingsT('previewing')
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {settingsT('previewCsv')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {previewRows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{settingsT('previewTitle')}</CardTitle>
              <CardDescription>
                {settingsT('previewDescription', { count: previewRows.length })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {previewErrors.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{settingsT('previewErrorCount', { count: previewErrors.length })}</span>
                  </div>
                  <div className="max-h-[120px] overflow-y-auto space-y-1">
                    {previewErrors.slice(0, 8).map((e, i) => (
                      <p key={i} className="text-xs text-destructive">
                        {settingsT('rowError', { row: e.row, message: e.message })}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="max-h-[260px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {previewColumns.map((column) => (
                        <TableHead key={column} className="whitespace-nowrap text-xs">{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        {previewColumns.map((column) => (
                          <TableCell key={column} className="max-w-[160px] truncate text-xs">
                            {String(row[column] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="flex-1"
                  onClick={handleImport}
                  disabled={loading || !selectedYearOpen}
                >
                  {loading ? settingsT('importing') : settingsT('confirmImport')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetPreview}
                  disabled={loading}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {settingsT('resetPreview')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>{settingsT('importResult')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium">{settingsT('importSuccessCount', { count: result.success })}</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{settingsT('importErrorCount', { count: result.errors.length })}</span>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-destructive">
                        {settingsT('rowError', { row: e.row, message: e.message })}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{settingsT('csvExample')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{studentT('id')}</TableHead>
                <TableHead>{studentT('prefix')}</TableHead>
                <TableHead>{studentT('firstName')}</TableHead>
                <TableHead>{studentT('lastName')}</TableHead>
                <TableHead>{studentT('gradeLevel')}</TableHead>
                <TableHead>{studentT('classroom')}</TableHead>
                <TableHead>{studentT('classNumber')}</TableHead>
                <TableHead>{studentT('stage')}</TableHead>
                <TableHead>{settingsT('guardianName')}</TableHead>
                <TableHead>{settingsT('relationship')}</TableHead>
                <TableHead>{settingsT('guardianPhone')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-xs">1234567890</TableCell>
                <TableCell>{settingsT('samplePrefixMale')}</TableCell>
                <TableCell>{settingsT('sampleFirstNameMale')}</TableCell>
                <TableCell>{settingsT('sampleLastNameMale')}</TableCell>
                <TableCell>1</TableCell>
                <TableCell>{settingsT('sampleClassroom')}</TableCell>
                <TableCell>15</TableCell>
                <TableCell>primary</TableCell>
                <TableCell>{settingsT('sampleGuardianMale')}</TableCell>
                <TableCell>{settingsT('sampleFather')}</TableCell>
                <TableCell>081-234-5678</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-xs">1234567891</TableCell>
                <TableCell>{settingsT('samplePrefixFemale')}</TableCell>
                <TableCell>{settingsT('sampleFirstNameFemale')}</TableCell>
                <TableCell>{settingsT('sampleLastNameFemale')}</TableCell>
                <TableCell>1</TableCell>
                <TableCell>{settingsT('sampleClassroom')}</TableCell>
                <TableCell>16</TableCell>
                <TableCell>primary</TableCell>
                <TableCell>{settingsT('sampleGuardianFemale')}</TableCell>
                <TableCell>{settingsT('sampleMother')}</TableCell>
                <TableCell>082-345-6789</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              const blob = new Blob([
                `${studentT('id')},${studentT('prefix')},${studentT('firstName')},${studentT('lastName')},${studentT('gradeLevel')},${studentT('classroom')},${studentT('classNumber')},${studentT('stage')},${settingsT('guardianName')},${settingsT('relationship')},${settingsT('guardianPhone')}\n` +
                `1234567890,${settingsT('samplePrefixMale')},${settingsT('sampleFirstNameMale')},${settingsT('sampleLastNameMale')},1,${settingsT('sampleClassroom')},15,primary,${settingsT('sampleGuardianMale')},${settingsT('sampleFather')},081-234-5678\n` +
                `1234567891,${settingsT('samplePrefixFemale')},${settingsT('sampleFirstNameFemale')},${settingsT('sampleLastNameFemale')},1,${settingsT('sampleClassroom')},16,primary,${settingsT('sampleGuardianFemale')},${settingsT('sampleMother')},082-345-6789\n`
              ], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'template_import.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="mr-2 h-4 w-4" />{settingsT('downloadExample')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
