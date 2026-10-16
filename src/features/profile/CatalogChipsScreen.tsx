import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { Chip, type ChipTone } from '@/components/Chip/Chip';
import type { IconName } from '@/components/Icon/paths';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { useToast } from '@/components/Toast/ToastProvider';
import { TopBar } from '@/components/TopBar/TopBar';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';

import { catalogLabel, type CatalogOption } from './catalog';
import { useProfile } from './ProfileProvider';

// A screen to pick from a catalog stored in the database (interests, outing types) with autosave:
// every tap adds or removes one row right away. If it fails the chip goes back to how it was and a
// toast explains. The screens that use it only say which catalog, how it looks and its limit.
export type CatalogChipsScreenProps = {
  testID: string;
  title: string;
  subtitle: (count: number) => string;
  loadErrorTitle: string;
  // Codes already chosen in the profile.
  initialCodes: string[];
  fetchCatalog: () => Promise<CatalogOption[]>;
  add: (userId: string, id: number) => Promise<void>;
  remove: (userId: string, id: number) => Promise<void>;
  tileFor: (code: string) => { icon: IconName; tone: ChipTone };
  // Most that can be chosen; no limit when left out.
  max?: number;
  onBack: () => void;
};

export function CatalogChipsScreen({
  testID,
  title,
  subtitle,
  loadErrorTitle,
  initialCodes,
  fetchCatalog,
  add,
  remove,
  tileFor,
  max,
  onBack,
}: CatalogChipsScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, spacing } = useTheme();
  const { show: showToast } = useToast();
  const { session } = useAuth();
  const userId = session?.user.id as string;
  const { reload } = useProfile();

  const [catalog, setCatalog] = useState<CatalogOption[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialCodes));

  const loadCatalog = useCallback(() => {
    setLoadFailed(false);
    fetchCatalog()
      .then(setCatalog)
      .catch((error) => {
        console.error('Catalog fetch error:', error);
        setLoadFailed(true);
        showToast({ tone: 'error', title: loadErrorTitle, message: t('profile.edit.tryAgain') });
      });
  }, [fetchCatalog, loadErrorTitle, showToast, t]);

  useEffect(loadCatalog, [loadCatalog]);

  const toggle = async (option: CatalogOption) => {
    const wasSelected = selected.has(option.code);
    if (!wasSelected && max != null && selected.size >= max) {
      return;
    }
    const apply = (picked: boolean) =>
      setSelected((current) => {
        const next = new Set(current);
        if (picked) {
          next.add(option.code);
        } else {
          next.delete(option.code);
        }
        return next;
      });

    apply(!wasSelected);
    try {
      await (wasSelected ? remove(userId, option.id) : add(userId, option.id));
      void reload();
    } catch (error) {
      console.error('Catalog save error:', error);
      apply(wasSelected);
      showToast({
        tone: 'error',
        title: t('profile.edit.saveErrorTitle'),
        message: t('profile.edit.tryAgain'),
      });
    }
  };

  const full = max != null && selected.size >= max;

  return (
    <SafeAreaView testID={testID} style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: spacing[2] }}>
        <TopBar title={t('profile.edit.title')} onBack={onBack} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[8], gap: spacing[3] }}
      >
        <SectionHeader title={title} subtitle={subtitle(selected.size)} />

        {loadFailed ? (
          <Button variant="link" style={styles.retry} onPress={loadCatalog}>
            {t('profile.retry')}
          </Button>
        ) : catalog ? (
          <View style={[styles.grid, { gap: spacing[2] }]}>
            {catalog.map((option) => {
              const tile = tileFor(option.code);
              const isSelected = selected.has(option.code);
              return (
                <View key={option.code} style={styles.cell}>
                  <Chip
                    variant="tile"
                    icon={tile.icon}
                    iconTone={tile.tone}
                    selected={isSelected}
                    disabled={full && !isSelected}
                    onPress={() => void toggle(option)}
                  >
                    {catalogLabel(option, i18n.language)}
                  </Chip>
                </View>
              );
            })}
          </View>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Two per row: the share leaves room for the gap.
  cell: {
    width: '48.5%',
  },
  retry: {
    alignSelf: 'center',
  },
});
