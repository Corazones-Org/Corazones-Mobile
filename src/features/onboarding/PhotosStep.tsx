import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { PhotoTile } from '@/components/PhotoTile/PhotoTile';
import { Stepper } from '@/components/Stepper/Stepper';
import { TipCard } from '@/components/TipCard/TipCard';
import { TopBar } from '@/components/TopBar/TopBar';
import { useAuth } from '@/features/auth/AuthProvider';
import type { OnboardingStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

import { fetchMyPhotos, photoUrl, removeProfilePhoto, uploadProfilePhoto, type StoredPhoto } from './api';
import type { ProcessedPhoto } from './imagePipeline';
import { processPhoto } from './imagePipeline';
import { StepLayout } from './StepLayout';

const MAX_PHOTOS = 6;

type Slot = {
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

export function PhotosStep({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'Photos'>) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id as string;

  const [slots, setSlotsState] = useState<Slot[]>([]);
  // The picker answers after an await, so uploads read the latest slots from a ref.
  const slotsRef = useRef<Slot[]>([]);
  const [ready, setReady] = useState(false);

  const setSlots = useCallback((update: (current: Slot[]) => Slot[]) => {
    slotsRef.current = update(slotsRef.current);
    setSlotsState(slotsRef.current);
  }, []);

  const patch = useCallback(
    (key: string, changes: Partial<Slot>) =>
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
      const slot: Slot = { key: newKey(), sortOrder, status: 'uploading', uri: asset.uri };
      setSlots((current) => [...current, slot]);
      return { slot, uri: asset.uri };
    });
    await Promise.all(reserved.map(({ slot, uri }) => upload(slot.key, slot.sortOrder, { uri })));
  }, [ready, setSlots, upload]);

  const removePhoto = useCallback(
    async (slot: Slot) => {
      if (!slot.stored) {
        setSlots((current) => current.filter((item) => item.key !== slot.key));
        return;
      }
      patch(slot.key, { status: 'uploading' });
      try {
        await removeProfilePhoto({ id: slot.stored.id, path: slot.stored.path });
        setSlots((current) => current.filter((item) => item.key !== slot.key));
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

  return (
    <StepLayout
      testID="photos-step"
      topBar={
        <TopBar>
          <Stepper steps={2} current={1} />
        </TopBar>
      }
      title={t('onboarding.photos.title')}
      subtitle={t('onboarding.photos.subtitle')}
      footer={
        <Button
          size="lg"
          block
          iconRight="arrowRight"
          disabled={!hasPhoto || busy}
          onPress={() => navigation.navigate('Details')}
        >
          {t('onboarding.continue')}
        </Button>
      }
    >
      <View style={[styles.grid, { gap: spacing[2] }]}>
        {Array.from({ length: MAX_PHOTOS }, (_, index) => {
          const slot = ordered[index];
          return (
            <View key={slot?.key ?? `empty-${index}`} style={styles.cell}>
              {slot ? (
                <PhotoTile
                  src={slot.uri}
                  main={index === 0}
                  loading={slot.status === 'uploading'}
                  error={slot.status === 'error'}
                  onRetry={
                    slot.processed
                      ? () => void upload(slot.key, slot.sortOrder, { processed: slot.processed as ProcessedPhoto })
                      : undefined
                  }
                  onRemove={() => void removePhoto(slot)}
                />
              ) : (
                <PhotoTile add onAdd={() => void pickPhotos()} />
              )}
            </View>
          );
        })}
      </View>

      <TipCard>{t('onboarding.photos.tip')}</TipCard>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Three per row: the share leaves room for the two gaps.
  cell: {
    width: '31.5%',
  },
});
