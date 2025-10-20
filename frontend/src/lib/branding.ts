export const BRAND_NAME = 'Wash&Go App';
export const BRAND_BASELINE = '';
export const BRAND_FULL_TITLE = BRAND_NAME;

export type BrandingColorId = 'black' | 'blue' | 'orange' | 'green' | 'charcoal';

export type BrandingColorOption = {
  id: BrandingColorId;
  label: string;
  light: string;
  dark: string;
};

export const BRANDING_COLOR_OPTIONS: BrandingColorOption[] = [
  { id: 'black', label: 'Noir', light: '#111111', dark: '#f4f5f7' },
  { id: 'blue', label: 'Bleu', light: '#0049ac', dark: '#9bbdff' },
  { id: 'orange', label: 'Orange', light: '#ff7a00', dark: '#ffae66' },
  { id: 'green', label: 'Vert', light: '#1a7f37', dark: '#5de095' },
  { id: 'charcoal', label: 'Gris foncé', light: '#2b2b2b', dark: '#d2d7e0' },
];

export const DEFAULT_BRANDING_COLOR_ID: BrandingColorId = 'blue';
export const BRANDING_COLOR_STORAGE_KEY = 'washandgo:accent';
export const LEGACY_BRANDING_COLOR_STORAGE_KEYS = ['washingo:accent', 'washango:accent'];

export const getBrandingColorOption = (id: BrandingColorId | string | null | undefined): BrandingColorOption => {
  const fallback = BRANDING_COLOR_OPTIONS.find((option) => option.id === DEFAULT_BRANDING_COLOR_ID)!;
  if (!id) {
    return fallback;
  }
  const match = BRANDING_COLOR_OPTIONS.find((option) => option.id === id);
  return match ?? fallback;
};

export const applyBrandingColorToDocument = (id: BrandingColorId | string | null | undefined) => {
  if (typeof document === 'undefined') {
    return;
  }
  const option = getBrandingColorOption(id as BrandingColorId);
  const root = document.documentElement;
  root.style.setProperty('--washingo-heading-color', option.light);
  root.style.setProperty('--washingo-accent-color', option.light);
  root.style.setProperty('--washingo-heading-color-dark', option.dark);
  root.style.setProperty('--washingo-accent-color-dark', option.dark);
};
