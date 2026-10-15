import { appEnv } from '@/lib/appEnv';
import type { ImageExtension } from './storagePaths';

// How profile photos are shrunk before upload. Weight drives the Storage bill (egress), so the
// numbers are small on purpose; tune them here after checking real files in Storage.
//  - display: the photo, cropped 3:4
//  - thumb: a square crop for lists and avatars
export type ImageProfile = {
  format: ImageExtension;
  display: { width: number; height: number; quality: number };
  thumb: { size: number; quality: number };
};

export const IMAGE_PROFILES: Record<'develop' | 'production', ImageProfile> = {
  // Light and cheap: ~20-30 KB photo, ~3-6 KB thumbnail. Quality is secondary while developing.
  develop: {
    format: 'webp',
    display: { width: 480, height: 640, quality: 0.5 },
    thumb: { size: 160, quality: 0.5 },
  },
  // Balanced starting point (~60 KB photo). To be decided before launch.
  production: {
    format: 'webp',
    display: { width: 600, height: 800, quality: 0.7 },
    thumb: { size: 200, quality: 0.6 },
  },
};

export const imageProfile = IMAGE_PROFILES[appEnv];

export function imageExtension(format: ImageProfile['format']) {
  return format;
}

export function imageMimeType(format: ImageProfile['format']) {
  return format === 'webp' ? 'image/webp' : 'image/jpeg';
}
