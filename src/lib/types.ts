export type PhotoSize = '2x2' | '1x1' | 'passport';

export interface PhotoDimensions {
  widthMm: number;
  heightMm: number;
  label: string;
}

export const PHOTO_SIZES: Record<PhotoSize, PhotoDimensions> = {
  '2x2': {
    widthMm: 50.8, // 2 inches
    heightMm: 50.8,
    label: '2×2 inch (51×51 mm)',
  },
  '1x1': {
    widthMm: 25.4, // 1 inch
    heightMm: 25.4,
    label: '1×1 inch (25×25 mm)',
  },
  'passport': {
    widthMm: 35, // 35mm
    heightMm: 45, // 45mm
    label: 'Passport (35×45 mm)',
  },
};

export type PhotoFormatCategory = '2x2' | 'passport' | '1x1';

export interface PackagePreset {
  id: string;
  name: string;
  category: PhotoFormatCategory;
  description: string;
  counts: {
    '2x2': number;
    '1x1': number;
    'passport': number;
  };
}

export const PACKAGE_PRESETS: PackagePreset[] = [
  // 2x2 Format Packages
  {
    id: '2x2-combo',
    name: '2×2 Standard Combo',
    category: '2x2',
    description: '2 pcs 2×2 + 8 pcs 1×1 (Standard Govt/Job)',
    counts: { '2x2': 2, '1x1': 8, 'passport': 0 },
  },
  {
    id: '2x2-balanced',
    name: '2×2 Balanced Pack',
    category: '2x2',
    description: '4 pcs 2×2 + 4 pcs 1×1',
    counts: { '2x2': 4, '1x1': 4, 'passport': 0 },
  },
  {
    id: '2x2-quad',
    name: '4 pcs 2×2 (Full 2×2 Grid)',
    category: '2x2',
    description: '4 pcs 2×2 inch photos (51×51 mm)',
    counts: { '2x2': 4, '1x1': 0, 'passport': 0 },
  },
  {
    id: '2x2-duo',
    name: '2 pcs 2×2 (Duo)',
    category: '2x2',
    description: '2 pcs 2×2 inch photos',
    counts: { '2x2': 2, '1x1': 0, 'passport': 0 },
  },

  // Passport Format Packages
  {
    id: 'passport-standard',
    name: '6 pcs Passport (Standard)',
    category: 'passport',
    description: '6 pcs Passport (35×45 mm / DFA & Visa)',
    counts: { '2x2': 0, '1x1': 0, 'passport': 6 },
  },
  {
    id: 'passport-combo',
    name: 'Passport + 1×1 Combo',
    category: 'passport',
    description: '4 pcs Passport (35×45mm) + 4 pcs 1×1',
    counts: { '2x2': 0, '1x1': 4, 'passport': 4 },
  },
  {
    id: 'passport-dual',
    name: 'Passport + 2×2 Dual Pack',
    category: 'passport',
    description: '2 pcs Passport + 2 pcs 2×2',
    counts: { '2x2': 2, '1x1': 0, 'passport': 2 },
  },

  // 1x1 Format Packages
  {
    id: '1x1-dozen',
    name: '12 pcs 1×1 Grid',
    category: '1x1',
    description: '12 pcs 1×1 inch photos (25×25 mm)',
    counts: { '2x2': 0, '1x1': 12, 'passport': 0 },
  },
  {
    id: '1x1-mega',
    name: '16 pcs 1×1 Grid',
    category: '1x1',
    description: '16 pcs 1×1 inch photos (Full Grid)',
    counts: { '2x2': 0, '1x1': 16, 'passport': 0 },
  },
  {
    id: '1x1-octa',
    name: '8 pcs 1×1 Mini',
    category: '1x1',
    description: '8 pcs 1×1 inch photos',
    counts: { '2x2': 0, '1x1': 8, 'passport': 0 },
  },
];

export interface CustomerPhotoData {
  originalImage: string; // Base64 or object URL
  processedImage: string; // Active preview
  processedImage2x2?: string; // Crisp 1:1 square crop for 2x2 and 1x1
  processedImagePassport?: string; // Crisp 7:9 crop for Passport (35x45mm)
  frameMode: '2x2' | 'passport' | '1x1';
  nameTagEnabled: boolean;
  customerName: string;
  backgroundColor: string; // 'transparent', '#FFFFFF', '#0D47A1', '#D32F2F', '#E0E0E0'
  presetId: string;
  customCounts: {
    '2x2': number;
    '1x1': number;
    'passport': number;
  };
}

export type QuadrantId = 'q1' | 'q2' | 'q3' | 'q4';

export interface QuadrantSlotState {
  id: QuadrantId;
  label: string;
  sublabel: string;
  enabled: boolean; // whether to print this quadrant
  format?: PhotoFormatCategory; // '2x2' | 'passport' | '1x1'
  photoData: CustomerPhotoData | null;
}

export interface DocumentFormData {
  fullName: string;
  positionOrTitle?: string;
  birthDate?: string;
  birthPlace?: string;
  gender?: string;
  civilStatus?: string;
  citizenship?: string;
  religion?: string;
  height?: string;
  weight?: string;
  bloodType?: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  tinOrIdNumber?: string;
  sssNumber?: string;
  spouseName?: string;
  fatherName?: string;
  motherName?: string;
  educationElementary?: string;
  educationSecondary?: string;
  educationCollege?: string;
  educationCourse?: string;
  experience?: string;
  skills?: string;
  reference1Name?: string;
  reference1Contact?: string;
  reference2Name?: string;
  reference2Contact?: string;
  photoUrl?: string; // Base64 cropped photo
  dateSigned?: string;
}

export type DocumentTemplateType = 'biodata' | 'resume' | 'certificate' | 'id_badge' | 'custom_docx';

export interface CustomDocxPlaceholder {
  key: string;
  label: string;
  type: 'text' | 'image' | 'date';
}
