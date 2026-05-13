'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface EvidenceFile {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

interface EvidenceUploaderProps {
  files: EvidenceFile[];
  onChange: (files: EvidenceFile[]) => void;
  uploading?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function EvidenceUploader({ files, onChange, uploading = false, maxFiles = 5, maxSizeMB = 5 }: EvidenceUploaderProps) {
  const t = useTranslations('score');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach(f => URL.revokeObjectURL(f.preview));
    };
  }, []);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const selected = Array.from(e.target.files || []);
    if (files.length + selected.length > maxFiles) {
      setError(t('maxEvidenceFiles', { maxFiles }));
      return;
    }
    for (const file of selected) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(t('evidenceTypesOnly'));
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(t('maxFileSize', { maxSizeMB }));
        return;
      }
    }
    const newFiles: EvidenceFile[] = selected.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
    }));
    onChange([...files, ...newFiles]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(files[index].preview);
    onChange(files.filter((_, i) => i !== index));
  };

  const doneCount = files.filter(f => f.status === 'done').length;
  const hasUploading = files.some(f => f.status === 'uploading');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading || files.length >= maxFiles}>
          <Upload className="h-4 w-4 mr-1" />
          {t('attachEvidence')}
        </Button>
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp" multiple className="hidden" onChange={handleSelect} />
        {files.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {uploading
              ? `${doneCount}/${files.length}`
              : t('fileCount', { count: files.length, maxFiles })}
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((item, i) => (
            <div key={i} className="relative group">
              <div className={`w-16 h-16 rounded-md border overflow-hidden ${item.status === 'error' ? 'border-destructive bg-destructive/5' : 'bg-muted'}`}>
                <img
                  src={item.preview}
                  alt={`evidence ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Status overlay */}
                {item.status === 'uploading' && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
                {item.status === 'done' && (
                  <div className="absolute bottom-0 right-0 bg-green-500 rounded-tl-md p-0.5">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </div>
                )}
                {item.status === 'error' && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                )}
              </div>
              {/* Remove button — only when not uploading */}
              {!uploading && (
                <button type="button" onClick={() => removeFile(i)} className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Create EvidenceFile array from plain File array
 */
export function createEvidenceFiles(files: File[]): EvidenceFile[] {
  return files.map(file => ({
    file,
    preview: URL.createObjectURL(file),
    status: 'pending' as const,
  }));
}
