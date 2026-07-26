import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

const BEST_SCORE_KEY = 'colorTest.bestScore';
const ADS_REMOVED_KEY = 'colorTest.adsRemoved';

type ScoreContextValue = {
  score: number;
  bestScore: number;
  adsRemoved: boolean;
  addPoints: (points: number) => void;
  resetSession: () => void;
  endSession: () => void;
  setAdsRemoved: (value: boolean) => void;
};

const ScoreContext = createContext<ScoreContextValue | null>(null);

export function ScoreProvider({ children }: { children: ReactNode }) {
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [adsRemoved, setAdsRemovedState] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const storedBest = await AsyncStorage.getItem(BEST_SCORE_KEY);
        if (storedBest !== null) {
          setBestScore(Number(storedBest) || 0);
        }
      } catch {
        // Keep the default of 0 if storage is unavailable.
      }
      try {
        const storedAdsRemoved = await AsyncStorage.getItem(ADS_REMOVED_KEY);
        if (storedAdsRemoved !== null) {
          setAdsRemovedState(storedAdsRemoved === 'true');
        }
      } catch {
        // Keep the default of false if storage is unavailable.
      }
    })();
  }, []);

  function addPoints(points: number) {
    setScore((current) => current + points);
  }

  function resetSession() {
    setScore(0);
  }

  function endSession() {
    setBestScore((currentBest) => {
      if (score <= currentBest) {
        return currentBest;
      }
      AsyncStorage.setItem(BEST_SCORE_KEY, String(score)).catch(() => {
        // Best score still updates in memory even if persistence fails.
      });
      return score;
    });
  }

  function setAdsRemoved(value: boolean) {
    setAdsRemovedState(value);
    AsyncStorage.setItem(ADS_REMOVED_KEY, String(value)).catch(() => {
      // Flag still updates in memory even if persistence fails.
    });
  }

  return (
    <ScoreContext.Provider
      value={{ score, bestScore, adsRemoved, addPoints, resetSession, endSession, setAdsRemoved }}
    >
      {children}
    </ScoreContext.Provider>
  );
}

export function useScore(): ScoreContextValue {
  const context = useContext(ScoreContext);
  if (!context) {
    throw new Error('useScore must be used within a ScoreProvider');
  }
  return context;
}
