import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';

import { fetchMyProfile } from './api';
import type { MyProfile } from './types';

type State =
  | { status: 'loading'; profile: null }
  | { status: 'error'; profile: null }
  | { status: 'ready'; profile: MyProfile };

export function useMyProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [state, setState] = useState<State>({ status: 'loading', profile: null });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;
    setState({ status: 'loading', profile: null });

    fetchMyProfile(userId)
      .then((profile) => !cancelled && setState({ status: 'ready', profile }))
      .catch((error) => {
        console.error('Profile fetch error:', error);
        if (!cancelled) {
          setState({ status: 'error', profile: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { ...state, reload };
}
