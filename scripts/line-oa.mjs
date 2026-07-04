import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const API_BASE = 'https://api.line.me/v2/bot';
const DATA_API_BASE = 'https://api-data.line.me/v2/bot';
const RICH_MENU_IMAGE = path.join('public', 'line', 'rich-menu.png');

function loadEnv() {
  const env = {};
  if (!existsSync('.env.local')) return env;
  const content = readFileSync('.env.local', 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();

function getToken() {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
  return env.LINE_CHANNEL_ACCESS_TOKEN;
}

function getRegisterUrl() {
  if (env.NEXT_PUBLIC_LIFF_URL) return env.NEXT_PUBLIC_LIFF_URL;
  if (env.NEXT_PUBLIC_SITE_URL) return `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/line/register`;
  if (env.NEXT_PUBLIC_LIFF_ID) return `https://liff.line.me/${env.NEXT_PUBLIC_LIFF_ID}`;
  return null;
}

async function lineFetch(base, pathname, init = {}) {
  const response = await fetch(`${base}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    throw new Error(`LINE API ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function messageAction(label, text = label) {
  return { type: 'message', label, text };
}

function richMenuDefinition() {
  const w1 = 834;
  const w2 = 833;
  const h = 843;
  return {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: 'student-conduct-main-v1',
    chatBarText: 'เมนูผู้ปกครอง',
    areas: [
      { bounds: { x: 0, y: 0, width: w1, height: h }, action: messageAction('ลงทะเบียน') },
      { bounds: { x: w1, y: 0, width: w2, height: h }, action: messageAction('คะแนนล่าสุด') },
      { bounds: { x: w1 + w2, y: 0, width: w2, height: h }, action: messageAction('ช่วยเหลือ') },
      { bounds: { x: 0, y: h, width: w1, height: h }, action: messageAction('ติดต่อโรงเรียน') },
      { bounds: { x: w1, y: h, width: w2, height: h }, action: messageAction('คะแนน') },
      { bounds: { x: w1 + w2, y: h, width: w2, height: h }, action: messageAction('help', 'help') },
    ],
  };
}

function tile(x, y, width, height, color, title, subtitle, icon) {
  return `
    <g transform="translate(${x} ${y})">
      <rect x="0" y="0" width="${width}" height="${height}" fill="${color}" />
      <circle cx="${width / 2}" cy="260" r="86" fill="rgba(255,255,255,0.18)" />
      <text x="${width / 2}" y="292" text-anchor="middle" font-family="Tahoma, Arial, sans-serif" font-size="104" font-weight="700" fill="#FFFFFF">${icon}</text>
      <text x="${width / 2}" y="452" text-anchor="middle" font-family="Tahoma, Arial, sans-serif" font-size="72" font-weight="700" fill="#FFFFFF">${title}</text>
      <text x="${width / 2}" y="540" text-anchor="middle" font-family="Tahoma, Arial, sans-serif" font-size="38" fill="rgba(255,255,255,0.86)">${subtitle}</text>
      <line x1="84" y1="${height - 1}" x2="${width - 84}" y2="${height - 1}" stroke="rgba(255,255,255,0.18)" stroke-width="2" />
    </g>`;
}

async function generateRichMenuImage() {
  await mkdir(path.dirname(RICH_MENU_IMAGE), { recursive: true });
  const w1 = 834;
  const w2 = 833;
  const h = 843;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="2500" height="1686" viewBox="0 0 2500 1686">
    <rect width="2500" height="1686" fill="#0F172A" />
    ${tile(0, 0, w1, h, '#16A34A', 'ลงทะเบียน', 'เชื่อมต่อผู้ปกครอง', '1')}
    ${tile(w1, 0, w2, h, '#2563EB', 'คะแนนล่าสุด', 'ดูคะแนนปัจจุบัน', '2')}
    ${tile(w1 + w2, 0, w2, h, '#7C3AED', 'ช่วยเหลือ', 'วิธีใช้งานระบบ', '3')}
    ${tile(0, h, w1, h, '#0F766E', 'ติดต่อโรงเรียน', 'สอบถามข้อมูล', '4')}
    ${tile(w1, h, w2, h, '#EA580C', 'ประวัติคะแนน', 'รายการล่าสุด', '5')}
    ${tile(w1 + w2, h, w2, h, '#475569', 'เมนูลัด', 'พิมพ์ help ได้เสมอ', '6')}
  </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(RICH_MENU_IMAGE);
  return RICH_MENU_IMAGE;
}

function sampleFlexMessages() {
  const registerUrl = getRegisterUrl();
  return [
    {
      type: 'flex',
      altText: 'ลงทะเบียนรับแจ้งเตือนผ่าน LINE',
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#16A34A',
          contents: [{ type: 'text', text: 'ระบบแจ้งเตือนผู้ปกครอง', color: '#FFFFFF', weight: 'bold', size: 'md' }],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            { type: 'text', text: 'เชื่อมต่อบัญชี LINE กับนักเรียน', weight: 'bold', size: 'lg', wrap: true },
            { type: 'text', text: 'รับแจ้งเตือนคะแนนความประพฤติและข่าวสารที่เกี่ยวข้อง', size: 'sm', color: '#6B7280', wrap: true },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#16A34A',
              action: registerUrl
                ? { type: 'uri', label: 'ลงทะเบียน', uri: registerUrl }
                : { type: 'message', label: 'ลงทะเบียน', text: 'ลงทะเบียน' },
            },
          ],
        },
      },
    },
  ];
}

async function info() {
  const bot = await lineFetch(API_BASE, '/info');
  console.log(JSON.stringify({
    ok: true,
    basicId: bot.basicId,
    displayName: bot.displayName,
    chatMode: bot.chatMode,
    markAsReadMode: bot.markAsReadMode,
  }, null, 2));
}

async function validateFlex() {
  await lineFetch(API_BASE, '/message/validate/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: sampleFlexMessages() }),
  });
  console.log(JSON.stringify({ ok: true, validated: 'flex-push-message' }, null, 2));
}

async function validateRichMenu() {
  await lineFetch(API_BASE, '/richmenu/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(richMenuDefinition()),
  });
  console.log(JSON.stringify({ ok: true, validated: 'rich-menu' }, null, 2));
}

async function setupRichMenu(args) {
  if (!args.includes('--apply')) {
    console.log(JSON.stringify({
      ok: false,
      skipped: true,
      reason: 'Add --apply to create, upload, and set the default rich menu on the real LINE OA.',
    }, null, 2));
    return;
  }

  const imagePath = await generateRichMenuImage();
  await validateRichMenu();
  const created = await lineFetch(API_BASE, '/richmenu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(richMenuDefinition()),
  });
  const image = await readFile(imagePath);
  await lineFetch(DATA_API_BASE, `/richmenu/${created.richMenuId}/content`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: image,
  });
  await lineFetch(API_BASE, `/user/all/richmenu/${created.richMenuId}`, { method: 'POST' });
  await writeFile(path.join('public', 'line', 'rich-menu.latest.json'), `${JSON.stringify({
    richMenuId: created.richMenuId,
    imagePath,
    appliedAt: new Date().toISOString(),
  }, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, richMenuId: created.richMenuId, imagePath }, null, 2));
}

async function listRichMenus() {
  const data = await lineFetch(API_BASE, '/richmenu/list');
  console.log(JSON.stringify({
    ok: true,
    count: data.richmenus?.length || 0,
    richmenus: (data.richmenus || []).map((menu) => ({
      richMenuId: menu.richMenuId,
      name: menu.name,
      chatBarText: menu.chatBarText,
      selected: menu.selected,
    })),
  }, null, 2));
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'info') return info();
  if (command === 'generate-image') {
    const imagePath = await generateRichMenuImage();
    console.log(JSON.stringify({ ok: true, imagePath }, null, 2));
    return;
  }
  if (command === 'validate-flex') return validateFlex();
  if (command === 'validate-rich-menu') return validateRichMenu();
  if (command === 'validate') {
    await validateFlex();
    await validateRichMenu();
    return;
  }
  if (command === 'list-rich-menus') return listRichMenus();
  if (command === 'setup-rich-menu') return setupRichMenu(args);

  console.log([
    'Usage:',
    '  node scripts/line-oa.mjs info',
    '  node scripts/line-oa.mjs generate-image',
    '  node scripts/line-oa.mjs validate',
    '  node scripts/line-oa.mjs list-rich-menus',
    '  node scripts/line-oa.mjs setup-rich-menu --apply',
  ].join('\n'));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
