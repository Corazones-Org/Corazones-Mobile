import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchMyPhotos, photoUrl, removeProfilePhoto, uploadProfilePhoto, type StoredPhoto } from './api';
import type { ProcessedPhoto } from './imagePipeline';
import { processPhoto } from './imagePipeline';

export const MAX_PHOTOS = 6;

export type PhotoSlot = {
  key: string;
  // Position in the profile (0 = main photo). Unique per user in the database.
  sortOrder: number;
  status: 'uploading' | 'done' | 'error';
  // Local file while uploading, the public URL for photos that are already saved.
  uri: string;
  stored?: StoredPhoto;
  // Kept so a failed upload can be retried without shrinking the image again.
  processed?: ProcessedPhoto;
};

let slotCounter = 0;
const newKey = () => `slot-${++slotCounter}`;

// The photo grid logic shared by onboarding and profile editing: loads the saved photos, picks new
// ones, uploads them (one slot each, with retry) and removes them. Photos are saved on the spot.
// `onChange` runs after a photo was saved or removed, so the caller can refresh the profile.
export function usePhotoSlots(userId: string, { onChange }: { onChange?: () => void } = {}) {
  const [slots, setSlotsState] = useState<PhotoSlot[]>([]);
  // The picker answers after an await, so uploads read the latest slots from a ref.
  const slotsRef = useRef<PhotoSlot[]>([]);
  const [ready, setReady] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setSlots = useCallback((update: (current: PhotoSlot[]) => PhotoSlot[]) => {
    slotsRef.current = update(slotsRef.current);
    setSlotsState(slotsRef.current);
  }, []);

  const patch = useCallback(
    (key: string, changes: Partial<PhotoSlot>) =>
      setSlots((current) => current.map((slot) => (slot.key === key ? { ...slot, ...changes } : slot))),
    [setSlots]
  );

  // Photos from an earlier session (the user came back to this step, or the app was reopened).
  useEffect(() => {
    let cancelled = false;
    fetchMyPhotos(userId)
      .then((photos) => {
        if (cancelled) {
          return;
        }
        setSlots((current) => [
          ...photos.slice(0, MAX_PHOTOS).map((photo) => ({
            key: newKey(),
            sortOrder: photo.sortOrder,
            status: 'done' as const,
            uri: photoUrl(photo.path),
            stored: photo,
          })),
          ...current,
        ]);
      })
      .catch((error) => console.error('Photos fetch error:', error))
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, [userId, setSlots]);

  const upload = useCallback(
    async (key: string, sortOrder: number, source: { uri: string } | { processed: ProcessedPhoto }) => {
      patch(key, { status: 'uploading' });
      try {
        const processed = 'processed' in source ? source.processed : await processPhoto(source.uri);
        patch(key, { processed });
        const stored = await uploadProfilePhoto({ userId, photo: processed, sortOrder });
        patch(key, { status: 'done', stored, uri: processed.display.uri });
        onChangeRef.current?.();
      } catch (error) {
        console.error('Photo upload error:', error);
        patch(key, { status: 'error' });
      }
    },
    [patch, userId]
  );

  const pickPhotos = useCallback(async () => {
    const free = MAX_PHOTOS - slotsRef.current.length;
    if (!ready || free <= 0) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: free,
      // The picker hands over the original; one compression happens later, in processPhoto.
      quality: 1,
    });
    if (result.canceled) {
      return;
    }

    const picked = result.assets.slice(0, MAX_PHOTOS - slotsRef.current.length);
    const reserved = picked.map((asset) => {
      const used = new Set(slotsRef.current.map((slot) => slot.sortOrder));
      let sortOrder = 0;
      while (used.has(sortOrder)) {
        sortOrder++;
      }
      const slot: PhotoSlot = { key: newKey(), sortOrder, status: 'uploading', uri: asset.uri };
      setSlots((current) => [...current, slot]);
      return { slot, uri: asset.uri };
    });
    await Promise.all(reserved.map(({ slot, uri }) => upload(slot.key, slot.sortOrder, { uri })));
  }, [ready, setSlots, upload]);

  const retryUpload = useCallback(
    (slot: PhotoSlot) => {
      if (slot.processed) {
        void upload(slot.key, slot.sortOrder, { processed: slot.processed });
      }
    },
    [upload]
  );

  const removePhoto = useCallback(
    async (slot: PhotoSlot) => {
      if (!slot.stored) {
        setSlots((current) => current.filter((item) => item.key !== slot.key));
        return;
      }
      patch(slot.key, { status: 'uploading' });
      try {
        await removeProfilePhoto({ id: slot.stored.id, path: slot.stored.path });
        setSlots((current) => current.filter((item) => item.key !== slot.key));
        onChangeRef.current?.();
      } catch (error) {
        console.error('Photo remove error:', error);
        patch(slot.key, { status: 'done' });
      }
    },
    [patch, setSlots]
  );

  const ordered = [...slots].sort((a, b) => a.sortOrder - b.sortOrder);
  const hasPhoto = slots.some((slot) => slot.status === 'done');
  const busy = slots.some((slot) => slot.status === 'uploading');
  const savedCount = slots.filter((slot) => slot.stored).length;

  return { slots: ordered, ready, hasPhoto, busy, savedCount, pickPhotos, retryUpload, removePhoto };
}
