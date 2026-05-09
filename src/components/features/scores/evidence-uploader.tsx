'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileImage, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EvidenceUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function EvidenceUploader({ files, onChange, maxFiles = 5, maxSizeMB = 5 }: EvidenceUploaderProps) {
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const selected = Array.from(e.target.files || []);
    if (files.length + selected.length > maxFiles) {
      setError(`อัปโหลดได้สูงสุด ${maxFiles} รูป`);
      return;
    }
    for (const file of selected) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('รองรับเฉพาะไฟล์ JPG, PNG, WebP เท่านั้น');
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`ไฟล์ต้องมีขนาดไม่เกิน ${maxSizeMB} MB`);
        return;
      }
    }
    onChange([...files, ...selected]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1" />
          แนบรูปหลักฐาน
        </Button>
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp" multiple className="hidden" onChange={handleSelect} />
        {files.length > 0 && <span className="text-xs text-muted-foreground">{files.length}/{maxFiles} รูป</span>}
      </div>
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, i) => (
            <div key={i} className="relative group">
              <div className="w-16 h-16 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
                <FileImage className="h-6 w-6 text-muted-foreground" />
              </div>
              <button type="button" onClick={() => removeFile(i)} className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
