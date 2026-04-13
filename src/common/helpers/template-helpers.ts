import * as fs from 'fs';
import * as path from 'path';

// Cache SVG icons at startup
const iconCache = new Map<string, string>();
const iconsDir = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'public',
  'images',
  'icons',
);

try {
  const files = fs.readdirSync(iconsDir);
  for (const file of files) {
    if (file.endsWith('.svg')) {
      const name = file.replace('.svg', '');
      iconCache.set(name, fs.readFileSync(path.join(iconsDir, file), 'utf-8'));
    }
  }
} catch {
  console.warn('Could not preload SVG icons from', iconsDir);
}

export const siteName = 'Music on the effected side of indie';

export const menu = [
  { slug: '/bands', title: 'Bands', icon: 'bands' },
  { slug: '/albums/', title: 'Albums', icon: 'cassette' },
  { slug: '/pedals', title: 'Pedals', icon: 'pedal' },
  { slug: '/tags', title: 'Tags', icon: 'pick' },
  { slug: '/map', title: 'Map', icon: 'map' },
];

export const icon = (name: string): string => {
  return iconCache.get(name) || '';
};

export const dump = (obj: any): string => JSON.stringify(obj, null, 2);

export const staticMap = ([lng, lat]: [number, number]): string =>
  `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=800x150&key=${process.env.MAP_KEY}&markers=${lat},${lng}&scale=2`;

export const buildDatesString = (dates: any[]): string => {
  return dates.reduce<string>((accum, next: any, index, arr) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const year = new Date(next).getFullYear().toString();
    if (arr.length === 1 || (arr.length === 3 && arr.length - 1 === index)) {
      return accum + year + '-present';
    } else if (index === 1 && arr.length - 1 !== index) {
      return accum + '-' + year + ', ';
    } else if (index === 1) {
      return accum + '-' + year;
    } else if (index === 0) {
      return accum + year;
    }
    return accum;
  }, '');
};
