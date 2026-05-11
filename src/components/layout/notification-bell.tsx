'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Bell, BellDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { createClient } from '@/lib/supabase/client';

interface Notification {
  id: string;
  title: string;
  body?: string;
  type: string;
  resource_type?: string;
  resource_id?: string;
  read_at?: string;
  created_at: string;
}

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function NotificationBell() {
  const t = useTranslations('notifications');
  const locale = useLocale();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(10);
  const [recipientId, setRecipientId] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?limit=${limit}`);
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data ?? [];
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.read_at).length);
      if (json.profile_id) setRecipientId(json.profile_id);
    } catch {
      // silently fail — user may not be authenticated
    }
  }, [limit]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      load();
    }, 30_000);
    const handleFocus = () => load();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') load();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [load]);

  useEffect(() => {
    if (!recipientId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${recipientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${recipientId}` },
        () => {
          load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, recipientId]);

  async function markRead(notification: Notification) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notification.id }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)));
    if (!notification.read_at) setUnreadCount((prev) => Math.max(0, prev - 1));
    if (notification.resource_type === 'student' && notification.resource_id) {
      setOpen(false);
      router.push(`/students/${notification.resource_id}`);
    } else if (notification.resource_type === 'score_transaction') {
      setOpen(false);
      router.push('/score/approval');
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="size-8 relative" />}>
        {unreadCount > 0 ? <BellDot className="size-4 text-primary" /> : <Bell className="size-4" />}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 font-medium border-b text-sm">{t('title')}</div>
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">{t('empty')}</div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.map((n) => (
              <button
                key={n.id}
                className={`w-full text-left p-3 text-sm border-b hover:bg-accent transition-colors ${!n.read_at ? 'bg-accent/50' : ''}`}
                onClick={() => markRead(n)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium">{n.title}</div>
                  <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {t.has(`types.${n.type}`) ? t(`types.${n.type}`) : n.type}
                  </span>
                </div>
                {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">
                  {formatDateTime(n.created_at, locale)}
                </div>
              </button>
            ))}
            {notifications.length >= limit && limit < 50 && (
              <button
                type="button"
                className="w-full p-3 text-center text-xs text-muted-foreground hover:bg-accent"
                onClick={() => setLimit((current) => Math.min(50, current + 10))}
              >
                {t('loadMore')}
              </button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
