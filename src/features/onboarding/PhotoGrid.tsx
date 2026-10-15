import { StyleSheet, View } from 'react-native';

import { PhotoTile } from '@/components/PhotoTile/PhotoTile';
import { useTheme } from '@/theme/ThemeProvider';

import { MAX_PHOTOS, type PhotoSlot } from './usePhotoSlots';

// The 3 x 2 grid of photos: saved or uploading photos first (the first is the main one), then
// "add photo" tiles up to the maximum. Shared by onboarding and profile editing.
export function PhotoGrid({
  slots,
  onAdd,
  onRemove,
  onRetry,
}: {
  slots: PhotoSlot[];
  onAdd: () => void;
  onRemove: (slot: PhotoSlot) => void;
  onRetry: (slot: PhotoSlot) => void;
}) {
  const { spacing } = useTheme();

  return (
    <View style={[styles.grid, { gap: spacing[2] }]}>
      {Array.from({ length: MAX_PHOTOS }, (_, index) => {
        const slot = slots[index];
        return (
          <View key={slot?.key ?? `empty-${index}`} style={styles.cell}>
            {slot ? (
              <PhotoTile
                src={slot.uri}
                main={index === 0}
                loading={slot.status === 'uploading'}
                error={slot.status === 'error'}
                onRetry={slot.processed ? () => onRetry(slot) : undefined}
                onRemove={() => onRemove(slot)}
              />
            ) : (
              <PhotoTile add onAdd={onAdd} />
            )}
          </View>
        );
      })}
    </View>
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
