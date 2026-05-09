'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { createClient } from '@/lib/supabase/client';

interface Notification {
  id: string;
  title: string;
  body?: string;
  type: string;
  read_at?: string;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data?.user?.id)
      .single();
    if (!profile) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read_at).length);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
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
        <div className="p-3 font-medium border-b text-sm">การแจ้งเตือน</div>
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">ไม่มีการแจ้งเตือน</div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.map((n) => (
              <button
                key={n.id}
                className={`w-full text-left p-3 text-sm border-b hover:bg-accent transition-colors ${!n.read_at ? 'bg-accent/50' : ''}`}
                onClick={() => markRead(n.id)}
              >
                <div className="font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleDateString('th-TH')}
                </div>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
