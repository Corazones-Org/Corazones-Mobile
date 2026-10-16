import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLiquidTabBarClearance } from '@/components/LiquidTabBar/clearance';
import type { MainTabParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

import { HowItWorks } from './HowItWorks';
import { ProfileSummaryCard } from './ProfileSummaryCard';

type Props = BottomTabScreenProps<MainTabParamList, 'Main'>;

// The Main tab (the screen users land on after signing in). The countdown to the next turn goes
// above these cards and arrives with COR-17.
export function MainScreen({ navigation }: Props) {
  const { colors, spacing } = useTheme();
  const bottomClearance = useLiquidTabBarClearance();

  return (
    <SafeAreaView
      testID="main-screen"
      edges={['top']}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: spacing[4],
          paddingBottom: bottomClearance,
          gap: spacing[4],
        }}
      >
        <HowItWorks />
        <ProfileSummaryCard onPress={() => navigation.navigate('Profile')} />
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
