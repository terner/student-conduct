-- Guardian LINE Links table
-- Links LINE user IDs to students for parent notifications
CREATE TABLE IF NOT EXISTS public.guardian_line_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  phone TEXT,
  relation TEXT DEFAULT 'guardian' CHECK (relation IN ('father', 'mother', 'guardian', 'relative', 'other')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guardian_line_links_line_user ON public.guardian_line_links(line_user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_line_links_student ON public.guardian_line_links(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_guardian_line_links_unique ON public.guardian_line_links(line_user_id, student_id);

-- Line Message Logs table
-- Tracks all LINE messages sent for audit and debugging
CREATE TABLE IF NOT EXISTS public.line_message_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id TEXT NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('score_deduction', 'score_add', 'attendance_absent', 'attendance_late', 'threshold_reached', 'welcome', 'test')),
  message_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'not_linked')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_line_message_logs_user ON public.line_message_logs(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_message_logs_student ON public.line_message_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_line_message_logs_status ON public.line_message_logs(status);
CREATE INDEX IF NOT EXISTS idx_line_message_logs_created ON public.line_message_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.guardian_line_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_message_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies: admin/superadmin can manage, service role for API
CREATE POLICY guardian_line_links_admin_all ON public.guardian_line_links
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.is_active = true
    AND (p.role::text = 'superadmin' OR p.role::text = 'admin')
  ));

CREATE POLICY line_message_logs_admin_all ON public.line_message_logs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.is_active = true
    AND (p.role::text = 'superadmin' OR p.role::text = 'admin')
  ));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_guardian_line_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guardian_line_links_updated_at
  BEFORE UPDATE ON public.guardian_line_links
  FOR EACH ROW
  EXECUTE FUNCTION update_guardian_line_links_updated_at();
