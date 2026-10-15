import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { supabase } from '@/lib/supabase';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

type AuthContextValue = {
  session: Session | null;
  status: AuthStatus;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // `undefined` = the stored session has not been read yet.
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) =>
      setSession(newSession)
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  // React Native does not tell supabase-js when the app goes to the background, so its token
  // refresh timer would keep running (or fire late) there. Run it only while the app is active.
  useEffect(() => {
    const syncAutoRefresh = (state: AppStateStatus) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    syncAutoRefresh(AppState.currentState);
    const appStateSubscription = AppState.addEventListener('change', syncAutoRefresh);

    return () => {
      appStateSubscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  const status: AuthStatus = session === undefined ? 'loading' : session ? 'signedIn' : 'signedOut';

  return (
    <AuthContext.Provider value={{ session: session ?? null, status }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
