'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getCategories, removeCategory, saveCategory } from '@/lib/actions/score.action';
import { ScoreCategoryForm } from '@/components/features/scores/score-category-form';
import type { ScoreCategory } from '@/types';
import type { ScoreCategoryInput } from '@/components/features/scores/score-category-form';

export default function ScoreCategoryPage() {
  const t = useTranslations('score');
  const commonT = useTranslations('common');
  const [categories, setCategories] = useState<ScoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState<ScoreCategory | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<ScoreCategory | null>(null);

  useEffect(() => {
    void Promise.resolve().then(loadCategories);
  }, []);

  async function loadCategories() {
    setLoading(true);
    const result = await getCategories();
    if (result.success && result.data) {
      setCategories(result.data);
    }
    setLoading(false);
  }

  async function handleSave(data: ScoreCategoryInput) {
    const result = await saveCategory(data);
    if (!result.success) {
      toast(commonT('error'), { description: result.error?.message });
      return;
    }
    setShowForm(false);
    setEditCategory(null);
    loadCategories();
  }

  async function handleDelete() {
    if (!deleteCategory) return;
    const result = await removeCategory(deleteCategory.id);
    if (!result.success) {
      toast(commonT('error'), { description: result.error?.message });
      return;
    }
    setDeleteCategory(null);
    toast(t('deleteCategorySuccess'));
    loadCategories();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('categoryManageTitle')}</h1>
          <p className="text-muted-foreground mt-1">{t('categoryManageDescription')}</p>
        </div>
        <Button onClick={() => { setEditCategory(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addCategory')}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{commonT('loading')}</p>
      ) : (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-destructive">{t('deductType')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categories.filter(c => c.type === 'deduct').map(c => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent">
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-destructive">{c.default_points}</Badge>
                  {c.requires_evidence && <Badge variant="outline" className="text-xs">{t('requiresEvidence')}</Badge>}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditCategory(c); setShowForm(true); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" aria-label={t('deleteCategory')} onClick={() => setDeleteCategory(c)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-600">{t('addType')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categories.filter(c => c.type === 'add').map(c => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent">
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">+{Math.abs(c.default_points)}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditCategory(c); setShowForm(true); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" aria-label={t('deleteCategory')} onClick={() => setDeleteCategory(c)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCategory ? t('editCategory') : t('addCategoryTitle')}</DialogTitle>
          </DialogHeader>
          <ScoreCategoryForm
            defaultValues={editCategory || undefined}
            onSubmit={handleSave}
            onCancel={() => { setShowForm(false); setEditCategory(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCategory} onOpenChange={(open) => !open && setDeleteCategory(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('deleteCategory')}</DialogTitle>
            {deleteCategory && (
              <DialogDescription>{t('deleteCategoryConfirm', { name: deleteCategory.name })}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategory(null)}>{commonT('cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete}>{commonT('delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
