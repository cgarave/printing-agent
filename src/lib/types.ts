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

export interface PackagePreset {
  id: string;
  name: string;
  description: string;
  counts: {
    '2x2': number;
    '1x1': number;
    'passport': number;
  };
}

export const PACKAGE_PRESETS: PackagePreset[] = [
  {
    id: 'preset-a',
    name: 'Package A (Standard Job/Govt)',
    description: '2 pcs 2×2 + 8 pcs 1×1',
    counts: { '2x2': 2, '1x1': 8, 'passport': 0 },
  },
  {
    id: 'preset-b',
    name: 'Package B (Balanced Combo)',
    description: '4 pcs 2×2 + 4 pcs 1×1',
    counts: { '2x2': 4, '1x1': 4, 'passport': 0 },
  },
  {
    id: 'preset-c',
    name: 'Package C (All 2×2)',
    description: '6 pcs 2×2',
    counts: { '2x2': 6, '1x1': 0, 'passport': 0 },
  },
  {
    id: 'preset-d',
    name: 'Package D (All 1×1)',
    description: '12 pcs 1×1',
    counts: { '2x2': 0, '1x1': 12, 'passport': 0 },
  },
  {
    id: 'preset-e',
    name: 'Package E (Passport Combo)',
    description: '6 pcs Passport (35×45mm) + 4 pcs 1×1',
    counts: { '2x2': 0, '1x1': 4, 'passport': 6 },
  },
];

export interface CustomerPhotoData {
  originalImage: string; // Base64 or object URL
  processedImage: string; // Cropped & filtered image
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
