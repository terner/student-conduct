'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, Save, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { getRolePermissions, updateRolePermissions } from '@/lib/actions/permission.action';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface RolePermission {
  role: string;
  permission_id: string;
}

interface ProfileOverride {
  profile_id: string;
  permission_id: string;
  allowed: boolean;
  profile_name?: string;
}

const ROLES = ['superadmin', 'admin', 'teacher', 'student'];
const ROLE_LABELS: Record<string, string> = {
  superadmin: 'ผู้ดูแลสูงสุด',
  admin: 'ผู้ดูแลระบบ',
  teacher: 'ครู',
  student: 'นักเรียน',
};

export default function PermissionsPage() {
  const permissionT = useTranslations('permission');
  const commonT = useTranslations('common');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const permResult = await getRolePermissions();
    if (permResult.success && permResult.data) {
      setPermissions(permResult.data.permissions);
      const rpMap = new Map<string, Set<string>>();
      for (const rp of permResult.data.rolePermissions) {
        if (!rpMap.has(rp.role)) rpMap.set(rp.role, new Set());
        rpMap.get(rp.role)!.add(rp.permission_id);
      }
      setRolePermissions(rpMap);
    } else if ('error' in permResult && permResult.error) {
      toast.error(permResult.error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function togglePermission(role: string, permissionId: string) {
    setRolePermissions(prev => {
      const next = new Map(prev);
      const set = new Set(next.get(role) || []);
      if (set.has(permissionId)) {
        set.delete(permissionId);
      } else {
        set.add(permissionId);
      }
      next.set(role, set);
      return next;
    });
    setHasChanges(true);
  }

  async function handleSave() {
    setSaving(true);
    const data = ROLES.flatMap(role => {
      const perms = rolePermissions.get(role) || new Set();
      return Array.from(perms).map(permissionId => ({ role, permission_id: permissionId }));
    });
    const result = await updateRolePermissions(data);
    if (result.success) {
      toast.success(permissionT('saveSuccess'));
      setHasChanges(false);
    } else {
      toast.error(result.error?.message ?? commonT('unknownError'));
    }
    setSaving(false);
  }

  // Group permissions by category
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const cat = p.category || 'อื่นๆ';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            {permissionT('title')}
          </h1>
          <p className="text-muted-foreground mt-1">{permissionT('description')}</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={() => { loadData(); setHasChanges(false); }}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {permissionT('cancel')}
            </Button>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? commonT('saving') : permissionT('save')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{permissionT('permissions')}</CardTitle>
          <CardDescription>
            {permissionT('description')} • {permissionT('superadminNote')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">{permissionT('permissions')}</TableHead>
                  {ROLES.map(role => (
                    <TableHead key={role} className="text-center w-[120px]">
                      <Badge variant={role === 'superadmin' ? 'default' : 'outline'}>
                        {ROLE_LABELS[role]}
                      </Badge>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(grouped).map(([category, perms]) => (
                  <Fragment key={category}>
                    <TableRow key={`cat-${category}`}>
                      <TableCell colSpan={ROLES.length + 1} className="bg-muted/50 font-semibold text-sm py-2">
                        {category}
                      </TableCell>
                    </TableRow>
                    {perms.map(perm => (
                      <TableRow key={perm.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{perm.name}</span>
                            {perm.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                            )}
                          </div>
                        </TableCell>
                        {ROLES.map(role => (
                          <TableCell key={role} className="text-center">
                            {role === 'superadmin' ? (
                              <Checkbox checked disabled />
                            ) : (
                              <Checkbox
                                checked={rolePermissions.get(role)?.has(perm.id) || false}
                                onCheckedChange={() => togglePermission(role, perm.id)}
                              />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
