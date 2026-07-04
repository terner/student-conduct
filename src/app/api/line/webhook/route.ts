import { NextRequest, NextResponse } from 'next/server';
import {
  buildLineContactFlex,
  buildLineHelpFlex,
  buildLineRegistrationFlex,
  buildLineStudentSummaryFlex,
  getLineRegisterUrl,
  replyLineMessage,
  sendLineMessage,
  verifyLineSignature,
  type LineMessage,
  type LineStudentScoreSummary,
} from '@/lib/line/client';
import { logAction } from '@/lib/audit/log';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-line-signature') || '';

    if (!(await verifyLineSignature(body, signature))) {
      console.error('[LINE Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookEvent = JSON.parse(body) as { events?: Record<string, unknown>[] };
    for (const event of webhookEvent.events || []) {
      await handleEvent(event);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[LINE Webhook] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function handleEvent(event: Record<string, unknown>) {
  const type = event.type as string;
  const source = event.source as Record<string, unknown> | undefined;
  const userId = source?.userId as string | undefined;
  const replyToken = event.replyToken as string | undefined;

  if (!userId) return;

  if (type === 'follow') {
    await deliverLineMessages(userId, replyToken, [buildLineRegistrationFlex(await getLineRegisterUrl())]);
    return;
  }

  if (type === 'unfollow') {
    const supabase = await createAdminClient();
    await supabase
      .from('guardian_line_links')
      .update({ is_active: false })
      .eq('line_user_id', userId);
    return;
  }

  if (type !== 'message') return;

  const message = event.message as Record<string, unknown> | undefined;
  if (message?.type !== 'text') return;

  const rawText = message.text as string;
  const registration = parseLineRegistrationText(rawText);
  if (registration) {
    if ('error' in registration) {
      await deliverLineMessages(userId, replyToken, [{ type: 'text', text: registration.error }]);
      return;
    }
    await registerLineFromChat(userId, replyToken, registration);
    return;
  }

  const command = normalizeLineCommand(rawText);
  const registerUrl = await getLineRegisterUrl();

  if (command === 'help' || command === 'ช่วยเหลือ') {
    await deliverLineMessages(userId, replyToken, [buildLineHelpFlex(registerUrl)]);
  } else if (command === 'register' || command === 'ลงทะเบียน') {
    await deliverLineMessages(userId, replyToken, [buildLineRegistrationFlex(registerUrl)]);
  } else if (command === 'score' || command === 'คะแนน' || command === 'คะแนนล่าสุด') {
    await sendLatestScoreSummary(userId, replyToken);
  } else if (command === 'contact' || command === 'ติดต่อ' || command === 'ติดต่อโรงเรียน') {
    await deliverLineMessages(userId, replyToken, [buildLineContactFlex()]);
  }
}

function normalizeLineCommand(text: string | undefined) {
  return (text || '').trim().toLowerCase().replace(/\s+/g, '');
}

type LineRelation = 'father' | 'mother' | 'guardian' | 'relative' | 'other';

interface ParsedLineRegistration {
  studentIdNumber: string;
  phone: string;
  relation: LineRelation;
}

const relationAliases: Record<string, LineRelation> = {
  father: 'father',
  mother: 'mother',
  guardian: 'guardian',
  relative: 'relative',
  other: 'other',
  พ่อ: 'father',
  บิดา: 'father',
  แม่: 'mother',
  มารดา: 'mother',
  ผู้ปกครอง: 'guardian',
  ญาติ: 'relative',
  อื่นๆ: 'other',
  อื่น: 'other',
};

function parseLineRegistrationText(text: string | undefined): ParsedLineRegistration | { error: string } | null {
  const parts = (text || '').trim().split(/\s+/).filter(Boolean);
  const keyword = parts[0]?.toLowerCase();
  if (keyword !== 'register' && keyword !== 'ลงทะเบียน') return null;
  if (parts.length === 1) return null;
  if (parts.length < 3) {
    return { error: 'พิมพ์: ลงทะเบียน รหัสนักเรียน เบอร์โทร เช่น ลงทะเบียน 12345 0812345678' };
  }

  const studentIdNumber = parts[1]?.trim();
  const phone = (parts[2] || '').replace(/\D/g, '');
  const relation = relationAliases[(parts[3] || '').toLowerCase()] || 'guardian';

  if (!studentIdNumber) {
    return { error: 'กรุณาระบุรหัสนักเรียน' };
  }
  if (phone.length < 9 || phone.length > 10) {
    return { error: 'กรุณาระบุเบอร์โทร 9-10 หลัก เช่น ลงทะเบียน 12345 0812345678' };
  }

  return { studentIdNumber, phone, relation };
}

async function deliverLineMessages(
  userId: string,
  replyToken: string | undefined,
  messages: LineMessage[],
) {
  if (replyToken) {
    const reply = await replyLineMessage(replyToken, messages);
    if (reply.success) return;
  }

  await sendLineMessage(userId, messages);
}

async function registerLineFromChat(
  userId: string,
  replyToken: string | undefined,
  input: ParsedLineRegistration,
) {
  const supabase = await createAdminClient();
  const { data: currentYear } = await supabase
    .from('academic_years')
    .select('id')
    .eq('is_current', true)
    .maybeSingle();

  if (!currentYear?.id) {
    await deliverLineMessages(userId, replyToken, [{ type: 'text', text: 'ยังไม่ได้ตั้งค่าปีการศึกษาปัจจุบัน' }]);
    return;
  }

  const { data: enrollment } = await supabase
    .from('student_enrollments')
    .select(`
      student_id,
      classrooms(name),
      students!inner(id, student_id_number, profiles!inner(full_name))
    `)
    .eq('academic_year_id', currentYear.id)
    .eq('students.student_id_number', input.studentIdNumber)
    .eq('enrollment_status', 'active')
    .limit(1)
    .maybeSingle();

  if (!enrollment) {
    await deliverLineMessages(userId, replyToken, [
      { type: 'text', text: 'ไม่พบรหัสนักเรียนนี้ในปีการศึกษาปัจจุบัน กรุณาตรวจสอบรหัสอีกครั้ง' },
    ]);
    return;
  }

  const student = enrollment.students as unknown as {
    id?: string;
    student_id_number?: string;
    profiles?: { full_name?: string };
  };
  const classroom = enrollment.classrooms as unknown as { name?: string } | null;
  const studentId = String(enrollment.student_id || student.id || '');
  if (!studentId) {
    await deliverLineMessages(userId, replyToken, [{ type: 'text', text: 'ไม่พบข้อมูลนักเรียน กรุณาลองใหม่อีกครั้ง' }]);
    return;
  }

  const { data: existingLink } = await supabase
    .from('guardian_line_links')
    .select('id')
    .eq('line_user_id', userId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existingLink?.id) {
    await supabase
      .from('guardian_line_links')
      .update({ is_active: true, phone: input.phone, relation: input.relation })
      .eq('id', existingLink.id);
  } else {
    const { count } = await supabase
      .from('guardian_line_links')
      .select('id', { count: 'exact', head: true })
      .eq('line_user_id', userId)
      .eq('is_active', true);

    if ((count || 0) >= 5) {
      await deliverLineMessages(userId, replyToken, [{ type: 'text', text: 'เชื่อมต่อนักเรียนได้สูงสุด 5 คนต่อ LINE หนึ่งบัญชี' }]);
      return;
    }

    const { error } = await supabase
      .from('guardian_line_links')
      .insert({
        line_user_id: userId,
        student_id: studentId,
        phone: input.phone,
        relation: input.relation,
        is_active: true,
      });

    if (error) {
      console.error('[LINE Webhook] Register link error:', error);
      await deliverLineMessages(userId, replyToken, [{ type: 'text', text: 'ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }]);
      return;
    }
  }

  await logAction({
    event: 'line_register_chat',
    resourceType: 'guardian_line_link',
    metadata: { student_id: studentId, relation: input.relation, has_phone: true },
  });

  await deliverLineMessages(userId, replyToken, [
    {
      type: 'text',
      text: `ลงทะเบียนสำเร็จ: ${student.profiles?.full_name || input.studentIdNumber}${classroom?.name ? ` ห้อง ${classroom.name}` : ''}\nพิมพ์ "คะแนนล่าสุด" เพื่อดูคะแนนปัจจุบัน`,
    },
  ]);
}

async function sendLatestScoreSummary(userId: string, replyToken: string | undefined) {
  const supabase = await createAdminClient();
  const registerUrl = await getLineRegisterUrl();
  const { data: links } = await supabase
    .from('guardian_line_links')
    .select('student_id')
    .eq('line_user_id', userId)
    .eq('is_active', true)
    .limit(5);

  if (!links?.length) {
    await deliverLineMessages(userId, replyToken, [buildLineRegistrationFlex(registerUrl)]);
    return;
  }

  const { data: currentYear } = await supabase
    .from('academic_years')
    .select('id, name, base_score')
    .eq('is_current', true)
    .maybeSingle();

  if (!currentYear?.id) {
    await deliverLineMessages(userId, replyToken, [
      { type: 'text', text: 'ยังไม่ได้ตั้งค่าปีการศึกษาปัจจุบัน' },
    ]);
    return;
  }

  const summaries: LineStudentScoreSummary[] = [];

  // ponytail: LINE links are capped at 5 per user, so per-student queries stay cheap.
  for (const link of links) {
    const studentId = link.student_id as string;
    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select(`
        student_id,
        classrooms(name),
        students!inner(student_id_number, profiles!inner(full_name))
      `)
      .eq('academic_year_id', currentYear.id)
      .eq('student_id', studentId)
      .eq('enrollment_status', 'active')
      .maybeSingle();

    if (!enrollment) continue;

    const { data: transactions } = await supabase
      .from('score_transactions')
      .select('points')
      .eq('student_id', studentId)
      .eq('academic_year_id', currentYear.id)
      .eq('status', 'approved');

    const totalDeducted = (transactions || [])
      .filter((row) => Number(row.points) < 0)
      .reduce((sum, row) => sum + Math.abs(Number(row.points) || 0), 0);
    const totalAdded = (transactions || [])
      .filter((row) => Number(row.points) > 0)
      .reduce((sum, row) => sum + (Number(row.points) || 0), 0);
    const baseScore = Number(currentYear.base_score) || 100;
    const student = enrollment.students as unknown as {
      student_id_number?: string;
      profiles?: { full_name?: string };
    };
    const classroom = enrollment.classrooms as unknown as { name?: string } | null;

    summaries.push({
      studentName: student.profiles?.full_name || '',
      studentIdNumber: student.student_id_number || '',
      classroomName: classroom?.name || '',
      academicYearName: String(currentYear.name || ''),
      baseScore,
      currentScore: baseScore - totalDeducted + totalAdded,
      totalDeducted,
      totalAdded,
    });
  }

  await deliverLineMessages(userId, replyToken, [
    buildLineStudentSummaryFlex(summaries, registerUrl),
  ]);
}
