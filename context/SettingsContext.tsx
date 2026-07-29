import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const SOUND_ENABLED_KEY = 'colorTest.soundEnabled';

type SettingsContextValue = {
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
  settingsLoaded: boolean;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
        if (stored !== null) {
          setSoundEnabledState(stored === 'true');
        }
      } catch {
        // Keep the default of true if storage is unavailable.
      }
      setSettingsLoaded(true);
    })();
  }, []);

  const setSoundEnabled = useCallback((value: boolean) => {
    setSoundEnabledState(value);
    AsyncStorage.setItem(SOUND_ENABLED_KEY, String(value)).catch(() => {
      // Flag still updates in memory even if persistence fails.
    });
  }, []);

  const value = useMemo(
    () => ({ soundEnabled, setSoundEnabled, settingsLoaded }),
    [soundEnabled, setSoundEnabled, settingsLoaded]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
