import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DetailsStep } from '@/features/onboarding/DetailsStep';
import { PhotosStep } from '@/features/onboarding/PhotosStep';
import { useProfile } from '@/features/profile/ProfileProvider';
import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

// The two onboarding steps. The user resumes where they left off: with a photo already saved
// they land on the second step (they can still go back to the photos).
export function OnboardingStack() {
  const profileState = useProfile();
  const hasPhoto = profileState.status === 'ready' && profileState.profile.photoPaths.length > 0;

  return (
    <Stack.Navigator
      initialRouteName={hasPhoto ? 'Details' : 'Photos'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Photos" component={PhotosStep} />
      <Stack.Screen name="Details" component={DetailsStep} />
    </Stack.Navigator>
  );
}
