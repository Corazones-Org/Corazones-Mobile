export type ImageExtension = 'webp' | 'jpeg';

// Where profile photos live in the environment's bucket: users/<user id>/profile/<file>.
export function photoPath(userId: string, photoId: string, extension: ImageExtension) {
  return `users/${userId}/profile/${photoId}.${extension}`;
}

// The thumbnail sits next to the photo and is found by name, so no extra column is needed.
export function photoThumbPath(path: string) {
  return path.replace(/\.(\w+)$/, '_thumb.$1');
}

// Sortable (time first) and unique enough for one user's handful of photos.
export function newPhotoId(now: number = Date.now(), random: () => number = Math.random) {
  const time = now.toString(36).padStart(9, '0');
  const noise = random().toString(36).slice(2, 8).padEnd(6, '0');
  return `${time}${noise}`;
}
