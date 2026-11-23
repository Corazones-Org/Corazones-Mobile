import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/features/auth/AuthProvider';

import { fetchMyProfile } from './api';
import type { MyProfile } from './types';

type State =
  | { status: 'loading'; profile: null }
  | { status: 'error'; profile: null }
  | { status: 'ready'; profile: MyProfile };

type ProfileContextValue = State & {
  // Fetches the profile again. After an error it goes back through `loading`; when a profile is
  // already shown it is swapped in place (no loading screen), e.g. when onboarding finishes.
  reload: () => Promise<void>;
};

const LOADING: State = { status: 'loading', profile: null };

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

// Loads the signed-in user's profile once, so the navigation gate (onboarding or app) and the
// Profile tab share it instead of each fetching it.
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [state, setState] = useState<State>(LOADING);
  // Answers that arrive after the user changed (sign-out, another account) are ignored.
  const activeUserId = useRef<string | undefined>(undefined);
  // Each save asks for the profile again, so two asks can overlap. Only the last one asked may
  // answer: an older, slower answer would put back the values from before the latest save.
  const lastRequest = useRef(0);

  const load = useCallback(async (id: string) => {
    const request = ++lastRequest.current;
    const isCurrent = () => activeUserId.current === id && lastRequest.current === request;
    try {
      const profile = await fetchMyProfile(id);
      if (isCurrent()) {
        setState({ status: 'ready', profile });
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      if (isCurrent()) {
        setState({ status: 'error', profile: null });
      }
    }
  }, []);

  useEffect(() => {
    activeUserId.current = userId;
    setState(LOADING);
    if (userId) {
      load(userId);
    }
  }, [userId, load]);

  const reload = useCallback(async () => {
    const id = activeUserId.current;
    if (!id) {
      return;
    }
    setState((current) => (current.status === 'error' ? LOADING : current));
    await load(id);
  }, [load]);

  const value = useMemo(() => ({ ...state, reload }), [state, reload]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used inside a ProfileProvider');
  }
  return context;
}
