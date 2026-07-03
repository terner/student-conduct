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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Empty } from '@/components/ui/empty';
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
  const t = useTranslations();
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
      toast.success('ลบผู้ปกครองสำเร็จ');
      setDeletingGuardian(null);
      await loadGuardians();
    } else {
      toast.error(result.error?.message || 'เกิดข้อผิดพลาด');
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
          <h3 className="text-lg font-semibold">ผู้ปกครอง</h3>
          {guardians.length > 0 && (
            <Badge variant="secondary">{guardians.length}</Badge>
          )}
        </div>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="mr-1 h-4 w-4" />
          เพิ่มผู้ปกครอง
        </Button>
      </div>

      {guardians.length === 0 ? (
        <Empty
          icon={<Users className="h-8 w-8 text-muted-foreground" />}
          title="ยังไม่มีผู้ปกครอง"
          description={studentName ? `เพิ่มผู้ปกครองของ${studentName}` : 'เพิ่มข้อมูลผู้ปกครอง'}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ-นามสกุล</TableHead>
                <TableHead>ความสัมพันธ์</TableHead>
                <TableHead>เบอร์โทร</TableHead>
                <TableHead>อีเมล</TableHead>
                <TableHead className="w-[100px]">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guardians.map((g) => (
                <TableRow key={g.link_id}>
                  <TableCell className="font-medium">
                    {g.full_name || [g.prefix, g.first_name, g.last_name].filter(Boolean).join(' ')}
                    {g.is_primary && (
                      <Badge variant="outline" className="ml-2 text-xs">หลัก</Badge>
                    )}
                  </TableCell>
                  <TableCell>{RELATION_LABELS[g.relation] || g.relation}</TableCell>
                  <TableCell>{g.phone || '-'}</TableCell>
                  <TableCell>{g.email || '-'}</TableCell>
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
              {editingGuardian ? 'แก้ไขผู้ปกครอง' : 'เพิ่มผู้ปกครอง'}
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
      <AlertDialog open={!!deletingGuardian} onOpenChange={(open) => !open && setDeletingGuardian(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบผู้ปกครอง {deletingGuardian?.full_name || ''} ออกจากรายการใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'กำลังลบ...' : 'ลบ'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
