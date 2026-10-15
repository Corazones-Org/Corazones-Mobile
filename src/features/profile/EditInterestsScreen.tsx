import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { Chip } from '@/components/Chip/Chip';
import { SectionHeader } from '@/components/SectionHeader/SectionHeader';
import { useToast } from '@/components/Toast/ToastProvider';
import { TopBar } from '@/components/TopBar/TopBar';
import { useAuth } from '@/features/auth/AuthProvider';
import type { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

import { addMyInterest, fetchInterestsCatalog, removeMyInterest, type InterestOption } from './api';
import { interestLabel, interestTile } from './interestTiles';
import { useProfile } from './ProfileProvider';

// The database allows at most 10 interests per profile (trigger `profile_interests_check`).
const MAX_INTERESTS = 10;

// Pick interests with autosave: every tap adds or removes one row right away. If it fails the chip
// goes back to how it was and a toast explains.
export function EditInterestsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'EditInterests'>) {
  const { t, i18n } = useTranslation();
  const { colors, spacing } = useTheme();
  const { show: showToast } = useToast();
  const { session } = useAuth();
  const userId = session?.user.id as string;
  const profileState = useProfile();
  const reload = profileState.reload;

  const [catalog, setCatalog] = useState<InterestOption[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(profileState.status === 'ready' ? profileState.profile.interests.map((i) => i.code) : [])
  );

  const loadCatalog = useCallback(() => {
    setLoadFailed(false);
    fetchInterestsCatalog()
      .then(setCatalog)
      .catch((error) => {
        console.error('Interests fetch error:', error);
        setLoadFailed(true);
        showToast({
          tone: 'error',
          title: t('profile.edit.interests.loadErrorTitle'),
          message: t('profile.edit.tryAgain'),
        });
      });
  }, [showToast, t]);

  useEffect(loadCatalog, [loadCatalog]);

  const toggle = async (interest: InterestOption) => {
    const wasSelected = selected.has(interest.code);
    if (!wasSelected && selected.size >= MAX_INTERESTS) {
      return;
    }
    const apply = (picked: boolean) =>
      setSelected((current) => {
        const next = new Set(current);
        if (picked) {
          next.add(interest.code);
        } else {
          next.delete(interest.code);
        }
        return next;
      });

    apply(!wasSelected);
    try {
      await (wasSelected ? removeMyInterest(userId, interest.id) : addMyInterest(userId, interest.id));
      void reload();
    } catch (error) {
      console.error('Interest save error:', error);
      apply(wasSelected);
      showToast({
        tone: 'error',
        title: t('profile.edit.saveErrorTitle'),
        message: t('profile.edit.tryAgain'),
      });
    }
  };

  const full = selected.size >= MAX_INTERESTS;

  return (
    <SafeAreaView testID="edit-interests-screen" style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: spacing[2] }}>
        <TopBar title={t('profile.edit.title')} onBack={navigation.goBack} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[8], gap: spacing[3] }}
      >
        <SectionHeader
          title={t('profile.edit.interests.title')}
          subtitle={t('profile.edit.interests.subtitle', { max: MAX_INTERESTS, count: selected.size })}
        />

        {loadFailed ? (
          <Button variant="link" style={styles.retry} onPress={loadCatalog}>
            {t('profile.retry')}
          </Button>
        ) : catalog ? (
          <View style={[styles.grid, { gap: spacing[2] }]}>
            {catalog.map((interest) => {
              const tile = interestTile(interest.code);
              const isSelected = selected.has(interest.code);
              return (
                <View key={interest.code} style={styles.cell}>
                  <Chip
                    variant="tile"
                    icon={tile.icon}
                    iconTone={tile.tone}
                    selected={isSelected}
                    disabled={full && !isSelected}
                    onPress={() => void toggle(interest)}
                  >
                    {interestLabel(interest, i18n.language)}
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
