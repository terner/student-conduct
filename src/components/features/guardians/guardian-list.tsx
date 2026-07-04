'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { toast } from 'sonner';
import { listGuardians, deleteGuardian } from '@/lib/actions/guardian.action';
import { GuardianForm } from './guardian-form';

interface GuardianData {
  link_id: string;
  guardian_id: string;
  prefix: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  occupation: string;
  relation: string;
  is_primary: boolean;
}

const RELATION_LABELS: Record<string, string> = {
  father: 'บิดา',
  mother: 'มารดา',
  guardian: 'ผู้ปกครอง',
  relative: 'ญาติ',
  other: 'อื่นๆ',
};

interface GuardianListProps {
  studentId: string;
  studentName?: string;
}

export function GuardianList({ studentId, studentName }: GuardianListProps) {
  const guardianT = useTranslations('guardian');
  const commonT = useTranslations('common');
  const [guardians, setGuardians] = useState<GuardianData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<GuardianData | null>(null);
  const [deletingGuardian, setDeletingGuardian] = useState<GuardianData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadGuardians = useCallback(async () => {
    setLoading(true);
    const result = await listGuardians(studentId);
    if (result.success) {
      setGuardians(result.data as GuardianData[]);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    loadGuardians();
  }, [loadGuardians]);

  function handleAdd() {
    setEditingGuardian(null);
    setShowForm(true);
  }

  function handleEdit(guardian: GuardianData) {
    setEditingGuardian(guardian);
    setShowForm(true);
  }

  async function handleDelete() {
    if (!deletingGuardian) return;
    setDeleting(true);
    const result = await deleteGuardian(deletingGuardian.link_id, studentId);
    if (result.success) {
      toast.success(guardianT('deleteSuccess'));
      setDeletingGuardian(null);
      await loadGuardians();
    } else {
      toast.error(result.error?.message ?? commonT('unknownError'));
    }
    setDeleting(false);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingGuardian(null);
    loadGuardians();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-semibold">{guardianT('title')}</h3>
          {guardians.length > 0 && (
            <Badge variant="secondary">{guardians.length}</Badge>
          )}
        </div>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="mr-1 h-4 w-4" />
          {guardianT('add')}
        </Button>
      </div>

      {guardians.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users className="h-8 w-8 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>{guardianT('empty')}</EmptyTitle>
            <EmptyDescription>
              {studentName ? `${guardianT('add')} ${studentName}` : guardianT('emptyDescription')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="mr-1 h-4 w-4" />
              {guardianT('add')}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{guardianT('name')}</TableHead>
                <TableHead>{guardianT('relationship')}</TableHead>
                <TableHead>{guardianT('phone')}</TableHead>
                <TableHead>{guardianT('email')}</TableHead>
                <TableHead className="w-[100px]">{commonT('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guardians.map((g) => (
                <TableRow key={g.link_id}>
                  <TableCell className="font-medium">
                    {g.full_name || [g.prefix, g.first_name, g.last_name].filter(Boolean).join(' ')}
                    {g.is_primary && (
                      <Badge variant="outline" className="ml-2 text-xs">{guardianT('primary')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{RELATION_LABELS[g.relation] ?? g.relation}</TableCell>
                  <TableCell>{g.phone}</TableCell>
                  <TableCell>{g.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(g)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingGuardian(g)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleFormClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingGuardian ? guardianT('edit') : guardianT('add')}
            </DialogTitle>
          </DialogHeader>
          <GuardianForm
            studentId={studentId}
            guardian={editingGuardian}
            onSuccess={handleFormClose}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingGuardian} onOpenChange={(open) => !open && setDeletingGuardian(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{guardianT('deleteConfirm')}</DialogTitle>
            <DialogDescription>
              {guardianT('deleteDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingGuardian(null)}>
              {commonT('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              variant="destructive"
            >
              {deleting ? commonT('processing') : guardianT('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
