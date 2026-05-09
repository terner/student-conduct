/**
 * School Configuration
 * 
 * ตั้งค่าสำหรับโรงเรียน — แก้ไขก่อน clone
 * - เปลี่ยนชื่อโรงเรียน, โลโก้, ที่อยู่
 * - เปิด/ปิด feature flags สำหรับฟีเจอร์ที่ไม่ใช่ MVP
 */

export const schoolConfig = {
  school: {
    name: 'โรงเรียนตัวอย่าง',
    nameEn: 'Example School',
    logo: '', // URL โลโก้ (ใช้จาก settings ใน DB)
    address: '',
    phone: '',
  },

  features: {
    lineNotify: false,
    emailSummary: false,
    pwa: false,
    monthlyReportSnapshot: true,
    atRiskReport: true,
    interventionLog: true,
    bondDocument: true,
    evidenceUpload: true,
    bulkScoreRecord: true,
    guardianManagement: true,
    auditLog: true,
    actionLog: true,
    scoreApproval: true,
    csvExport: true,
    statistics: true,
  },

  defaults: {
    baseScore: 100,
    scoreFloor: 0,
    scoreCeiling: null as number | null,
    displayScoreAboveBaseAs: '100+',
    language: 'th' as 'th' | 'en',
  },

  conductLevels: [
    { name: 'ดีมาก', min: 100, max: 999, color: '#27500A' },
    { name: 'ดี', min: 80, max: 99, color: '#0C447C' },
    { name: 'พอใช้', min: 50, max: 79, color: '#633806' },
    { name: 'ต้องปรับปรุง', min: 0, max: 49, color: '#A32D2D' },
  ],

  thresholds: [
    { deducted: 40, action: 'ทำทัณฑ์บนครั้งที่ 1 — เชิญผู้ปกครอง' },
    { deducted: 60, action: 'ทำทัณฑ์บนครั้งที่ 2 — เชิญผู้ปกครอง' },
    { deducted: 80, action: 'ทำทัณฑ์บนครั้งที่ 3 — อาจพักการเรียน' },
    { deducted: 100, action: 'ย้ายสถานศึกษา' },
  ],
};

export type SchoolConfig = typeof schoolConfig;
