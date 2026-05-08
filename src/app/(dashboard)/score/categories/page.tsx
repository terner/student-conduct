'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getCategories, saveCategory } from '@/lib/actions/score.action';
import { ScoreCategoryForm } from '@/components/features/scores/score-category-form';
import type { ScoreCategory } from '@/types';

export default function ScoreCategoryPage() {
  const [categories, setCategories] = useState<ScoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState<ScoreCategory | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    const result = await getCategories();
    if (result.success && result.data) {
      setCategories(result.data);
    }
    setLoading(false);
  }

  async function handleSave(data: any) {
    await saveCategory(data);
    setShowForm(false);
    setEditCategory(null);
    loadCategories();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการประเภทคะแนน</h1>
          <p className="text-muted-foreground mt-1">เพิ่ม แก้ไข จัดการหมวดหมู่คะแนนความประพฤติ</p>
        </div>
        <Button onClick={() => { setEditCategory(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มประเภท
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-destructive">หักคะแนน</CardTitle>
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
                  {c.requires_evidence && <Badge variant="outline" className="text-xs">ต้องมีหลักฐาน</Badge>}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditCategory(c); setShowForm(true); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-600">เพิ่มคะแนน</CardTitle>
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
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCategory ? 'แก้ไขประเภทคะแนน' : 'เพิ่มประเภทคะแนน'}</DialogTitle>
          </DialogHeader>
          <ScoreCategoryForm
            defaultValues={editCategory || undefined}
            onSubmit={handleSave}
            onCancel={() => { setShowForm(false); setEditCategory(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
