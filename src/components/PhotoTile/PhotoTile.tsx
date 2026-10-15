import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '../Icon/Icon';

// Design system PhotoTile: portrait (3:4) photo with a remove ×, or the dashed "add photo" slot.
// `src` is an image uri. `loading`, `error` and `onRetry` are app additions for the upload states.
export type PhotoTileProps = {
  src?: string;
  alt?: string;
  main?: boolean;
  onRemove?: (() => void) | false;
  add?: boolean;
  onAdd?: () => void;
  label?: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
};

export function PhotoTile({
  src,
  alt,
  main,
  onRemove,
  add,
  onAdd,
  label,
  loading,
  error,
  onRetry,
}: PhotoTileProps) {
  const { t } = useTranslation();
  const { colors, radius, spacing, shadow, typography } = useTheme();

  if (add) {
    const addLabel = label ?? t('components.photoTile.add');
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={addLabel}
        onPress={onAdd}
        style={[
          styles.tile,
          styles.add,
          {
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderColor: colors.gradSoftStart,
            padding: spacing[2],
          },
        ]}
      >
        <Icon name="plusCircle" size={24} color={colors.primary} />
        <Text
          style={[
            styles.addLabel,
            { color: colors.primaryText, fontFamily: typography.label.fontFamily },
          ]}
        >
          {addLabel}
        </Text>
      </Pressable>
    );
  }

  const showRemove = onRemove !== false && onRemove != null && !loading;

  return (
    <View
      style={[
        styles.tile,
        { borderRadius: radius.md, backgroundColor: colors.surface },
        main && { borderWidth: 2, borderColor: colors.primary },
      ]}
    >
      {src ? (
        <Image
          testID="photo-tile-image"
          accessibilityLabel={alt}
          source={{ uri: src }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Icon name="user" size={40} color={colors.gradSoftStart} strokeWidth={1.4} />
        </View>
      )}

      {main ? (
        <View style={[styles.mainBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.mainText, { color: colors.onPrimary, fontFamily: typography.button.fontFamily }]}>
            {t('components.photoTile.main')}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.glass }]}>
          <ActivityIndicator testID="photo-tile-spinner" color={colors.primary} />
        </View>
      ) : null}

      {error && !loading ? (
        <View style={[StyleSheet.absoluteFill, styles.center, styles.errorOverlay, { backgroundColor: colors.scrim }]}>
          <Text style={[styles.errorText, { color: colors.onPhoto, fontFamily: typography.label.fontFamily }]}>
            {t('components.photoTile.uploadFailed')}
          </Text>
          {onRetry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('components.photoTile.retry')}
              onPress={onRetry}
              style={[styles.retry, { backgroundColor: colors.card }]}
            >
              <Text style={[styles.retryText, { color: colors.primaryText, fontFamily: typography.button.fontFamily }]}>
                {t('components.photoTile.retry')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('components.photoTile.remove')}
          onPress={onRemove as () => void}
          hitSlop={8}
          style={[styles.remove, { backgroundColor: colors.glass }, shadow.float]}
        >
          <Icon name="x" size={14} color={colors.error} strokeWidth={2.8} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    aspectRatio: 3 / 4,
    overflow: 'hidden',
  },
  add: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addLabel: {
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  mainText: {
    fontSize: 11,
    lineHeight: 14,
  },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorOverlay: {
    gap: 8,
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  retry: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  retryText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
