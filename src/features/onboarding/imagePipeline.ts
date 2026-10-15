import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';

import { imageProfile, type ImageProfile } from './imageProfiles';

export type ProcessedImage = { uri: string; width: number; height: number };
export type ProcessedPhoto = { display: ProcessedImage; thumb: ProcessedImage };

const PHOTO_RATIO = 3 / 4;

type Rect = { originX: number; originY: number; width: number; height: number };

// Largest 3:4 rectangle, centered.
function portraitCrop(width: number, height: number): Rect {
  if (width / height > PHOTO_RATIO) {
    const cropWidth = Math.round(height * PHOTO_RATIO);
    return { originX: Math.round((width - cropWidth) / 2), originY: 0, width: cropWidth, height };
  }
  const cropHeight = Math.round(width / PHOTO_RATIO);
  return { originX: 0, originY: Math.round((height - cropHeight) / 2), width, height: cropHeight };
}

// Largest square, centered.
function squareCrop(width: number, height: number): Rect {
  const side = Math.min(width, height);
  return {
    originX: Math.round((width - side) / 2),
    originY: Math.round((height - side) / 2),
    width: side,
    height: side,
  };
}

async function cropResizeSave(
  source: ImageRef,
  crop: Rect,
  targetWidth: number,
  quality: number,
  format: ImageProfile['format']
): Promise<ProcessedImage> {
  const rendered = await ImageManipulator.manipulate(source)
    .crop(crop)
    .resize({ width: targetWidth })
    .renderAsync();
  const saved = await rendered.saveAsync({
    format: format === 'webp' ? SaveFormat.WEBP : SaveFormat.JPEG,
    compress: quality,
  });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}

// Turns a picked image into the two files we store: the photo (3:4 crop) and a square thumbnail,
// both small. The size is read from the decoded image because the picker's width/height can ignore
// the EXIF rotation.
export async function processPhoto(
  uri: string,
  profile: ImageProfile = imageProfile
): Promise<ProcessedPhoto> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const { width, height } = original;

  const display = await cropResizeSave(
    original,
    portraitCrop(width, height),
    profile.display.width,
    profile.display.quality,
    profile.format
  );
  const thumb = await cropResizeSave(
    original,
    squareCrop(width, height),
    profile.thumb.size,
    profile.thumb.quality,
    profile.format
  );

  return { display, thumb };
}
