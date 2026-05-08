export interface SchoolConfig {
  school: {
    name: string;
    nameEn: string;
    logo: string;
    address: string;
    phone: string;
  };
  defaults: {
    baseScore: number;
    scoreFloor: number;
    scoreCeiling: number | null;
    displayScoreAboveBaseAs: string;
    academicYear: string;
    language: 'th' | 'en';
  };
  conductLevels: ConductLevel[];
  thresholds: Threshold[];
}

export interface ConductLevel {
  name: string;
  min: number;
  max: number;
  color: string;
}

export interface Threshold {
  deducted: number;
  action: string;
  color: string;
}
