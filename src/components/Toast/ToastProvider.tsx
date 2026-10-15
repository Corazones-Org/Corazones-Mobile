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
import { StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { Toast, type ToastProps } from './Toast';

const AUTO_DISMISS_MS = 4000;

export type ShowToastOptions = Omit<ToastProps, 'children'> & {
  // Second line under the title.
  message?: string;
};

type ToastContextValue = { show: (options: ShowToastOptions) => void; hide: () => void };

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Shows one toast at a time at the top of the screen, above everything (including the navigator).
// A new toast replaces the current one. It closes by itself after 4 s unless it has an action.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ShowToastOptions | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Without a SafeAreaProvider (tests, isolated use) there are simply no insets.
  const insets = useContext(SafeAreaInsetsContext);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((options: ShowToastOptions) => {
    clearTimeout(timer.current);
    setToast(options);
    if (!options.action) {
      timer.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
    }
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View
          pointerEvents="box-none"
          style={[styles.overlay, { top: (insets?.top ?? 0) + 8 }]}
        >
          <Toast
            tone={toast.tone}
            title={toast.title}
            icon={toast.icon}
            action={toast.action}
            onAction={toast.onAction}
          >
            {toast.message}
          </Toast>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
});
