import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ColorButton } from '../components/ColorButton';
import { ScoreBadge } from '../components/ScoreBadge';
import { TimerBar } from '../components/TimerBar';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { hexFor } from '../lib/colors';
import { generateRound } from '../lib/generateRound';
import { showInterstitial } from '../services/ads';
import { errorFeedback, successFeedback } from '../services/haptics';
import { playSound } from '../services/sound';

const SESSION_MS = 60_000;
const TICK_MS = 100;
const POINTS_PER_CORRECT = 10;

export default function GameScreen() {
  const { t, colorName } = useLanguage();
  const { score, adsRemoved, addPoints, resetSession, endSession } = useScore();
  const [round, setRound] = useState(() => generateRound());
  const [remainingMs, setRemainingMs] = useState(SESSION_MS);
  const endedRef = useRef(false);

  useEffect(() => {
    resetSession();
  }, [resetSession]);

  const finishGame = useCallback(() => {
    if (endedRef.current) {
      return;
    }
    endedRef.current = true;
    endSession();
    showInterstitial(adsRemoved);
    router.replace('/result');
  }, [endSession, adsRemoved]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs((current) => Math.max(0, current - TICK_MS));
    }, TICK_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (remainingMs <= 0) {
      finishGame();
    }
  }, [remainingMs, finishGame]);

  function handleAnswer(selected: string) {
    if (endedRef.current) {
      return;
    }
    if (selected === round.ink) {
      addPoints(POINTS_PER_CORRECT);
      successFeedback();
      playSound('correct');
      setRound(generateRound());
    } else {
      errorFeedback();
      playSound('wrong');
      finishGame();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <TimerBar progress={remainingMs / SESSION_MS} />
      <ScoreBadge label={t('score')} value={score} />
      <View style={styles.wordContainer}>
        <Text style={[styles.word, { color: hexFor(round.ink) }]}>{colorName(round.word)}</Text>
      </View>
      <View style={styles.options}>
        {round.options.map((id) => (
          <ColorButton key={id} colorId={id} label={colorName(id)} onPress={() => handleAnswer(id)} />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', padding: 16 },
  wordContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  word: { fontSize: 48, fontWeight: '800' },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
