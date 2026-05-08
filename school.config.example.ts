import { SchoolConfig } from '@/types/config';

export const schoolConfig: SchoolConfig = {
  school: {
    name: 'โรงเรียนตัวอย่าง',
    nameEn: 'Example School',
    logo: '',
    address: '123 ถนน...',
    phone: '02-xxx-xxxx',
  },

  defaults: {
    baseScore: 100,
    scoreFloor: 0,
    scoreCeiling: null,
    displayScoreAboveBaseAs: '100+',
    academicYear: '2569',
    language: 'th',
  },

  conductLevels: [
    { name: 'ดีมาก', min: 100, max: 999, color: '#27500A' },
    { name: 'ดี', min: 80, max: 99, color: '#0C447C' },
    { name: 'พอใช้', min: 50, max: 79, color: '#633806' },
    { name: 'ต้องปรับปรุง', min: 0, max: 49, color: '#A32D2D' },
  ],

  thresholds: [
    { deducted: 40, action: 'ทำทัณฑ์บนครั้งที่ 1 — เชิญผู้ปกครอง', color: '#E68A2E' },
    { deducted: 60, action: 'ทำทัณฑ์บนครั้งที่ 2 — เชิญผู้ปกครอง', color: '#D9534F' },
    { deducted: 80, action: 'ทำทัณฑ์บนครั้งที่ 3 — อาจพักการเรียน', color: '#C9302C' },
    { deducted: 100, action: 'ย้ายสถานศึกษา', color: '#8B0000' },
  ],
};
