export type ThemeName =
  | 'Hanle Black'
  | 'Mana Black'
  | 'Kamet White'
  | 'Slate Himalayan Salt'
  | 'Slate Poppy Blue'
  | 'Kaza Brown';

export type Palette = {
  name: ThemeName;
  bg: string;
  surface: string;
  surfaceHigh: string;
  accent: string;
  accentBright: string;
  text: string;
  textMid: string;
  textLo: string;
  line: string;
  alert: string;
  warn: string;
  ok: string;
  onAccent: string;
  isLight: boolean;
};

const palettes: Record<ThemeName, Palette> = {
  'Hanle Black': {
    name: 'Hanle Black',
    bg: '#070707',
    surface: '#1A1A1B',
    surfaceHigh: '#242426',
    accent: '#B78B4B',
    accentBright: '#C6A46A',
    text: '#C8C4BD',
    textMid: '#A89B88',
    textLo: '#716A61',
    line: '#3F3327',
    alert: '#FF6B6B',
    warn: '#FFC857',
    ok: '#5EE0A0',
    onAccent: '#070707',
    isLight: false,
  },
  'Mana Black': {
    name: 'Mana Black',
    bg: '#0B0C0E',
    surface: '#1F2225',
    surfaceHigh: '#2A2E32',
    accent: '#B4B9BA',
    accentBright: '#C9C7C3',
    text: '#C9C7C3',
    textMid: '#7D8588',
    textLo: '#3F4448',
    line: '#3F4448',
    alert: '#FF6B6B',
    warn: '#FFC857',
    ok: '#5EE0A0',
    onAccent: '#0B0C0E',
    isLight: false,
  },
  'Kamet White': {
    name: 'Kamet White',
    bg: '#E6E6DD',
    surface: '#F3F3EC',
    surfaceHigh: '#FFFFFF',
    accent: '#34383A',
    accentBright: '#0A0B0C',
    text: '#0A0B0C',
    textMid: '#34383A',
    textLo: '#8D918D',
    line: '#C9CBC5',
    alert: '#C23B3B',
    warn: '#B8860B',
    ok: '#1F7A4D',
    onAccent: '#E6E6DD',
    isLight: true,
  },
  'Slate Himalayan Salt': {
    name: 'Slate Himalayan Salt',
    bg: '#08090A',
    surface: '#222629',
    surfaceHigh: '#2C3236',
    accent: '#E05257',
    accentBright: '#FF6B70',
    text: '#AEB3AF',
    textMid: '#8A9090',
    textLo: '#5E6364',
    line: '#3A4044',
    alert: '#FF6B6B',
    warn: '#FFC857',
    ok: '#5EE0A0',
    onAccent: '#08090A',
    isLight: false,
  },
  'Slate Poppy Blue': {
    name: 'Slate Poppy Blue',
    bg: '#08090A',
    surface: '#202428',
    surfaceHigh: '#2A3036',
    accent: '#3F78B7',
    accentBright: '#5A93D1',
    text: '#C8CDD1',
    textMid: '#7B8285',
    textLo: '#4E565A',
    line: '#3A4248',
    alert: '#FF6B6B',
    warn: '#FFC857',
    ok: '#5EE0A0',
    onAccent: '#08090A',
    isLight: false,
  },
  'Kaza Brown': {
    name: 'Kaza Brown',
    bg: '#090A0A',
    surface: '#25282A',
    surfaceHigh: '#313436',
    accent: '#C8C4B0',
    accentBright: '#E6E2D0',
    text: '#E6E2D0',
    textMid: '#C7C4BA',
    textLo: '#686B66',
    line: '#3A3D3A',
    alert: '#FF6B6B',
    warn: '#FFC857',
    ok: '#5EE0A0',
    onAccent: '#090A0A',
    isLight: false,
  },
};

export const THEME_NAMES = Object.keys(palettes) as ThemeName[];
export const DEFAULT_THEME: ThemeName = 'Hanle Black';

export function paletteFor(name: ThemeName): Palette {
  return palettes[name] ?? palettes['Hanle Black'];
}
