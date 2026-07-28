import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { ColorButton } from '../components/ColorButton';
import { ScoreBadge } from '../components/ScoreBadge';
import { TimerBar } from '../components/TimerBar';
import { useLanguage } from '../context/LanguageContext';
import { useScore } from '../context/ScoreContext';
import { ColorId, hexFor } from '../lib/colors';
import { generateRound } from '../lib/generateRound';
import { roundDurationFor } from '../lib/roundDuration';
import { THEME } from '../lib/theme';
import { showInterstitial } from '../services/ads';
import { errorFeedback, successFeedback } from '../services/haptics';
import { playSound } from '../services/sound';

const TICK_MS = 100;
const POINTS_PER_CORRECT = 10;
const RESULT_TRANSITION_DELAY_MS = 450;

export default function GameScreen() {
  const { t, colorName } = useLanguage();
  const { score, adsRemoved, addPoints, resetSession, endSession } = useScore();
  const [round, setRound] = useState(() => generateRound());
  const [correctCount, setCorrectCount] = useState(0);
  const [remainingMs, setRemainingMs] = useState(() => roundDurationFor(0));
  const [flashColor, setFlashColor] = useState(hexFor('red'));
  const endedRef = useRef(false);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const roundDurationMs = roundDurationFor(correctCount);

  const wordScale = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  useEffect(() => {
    resetSession();
  }, [resetSession]);

  useEffect(() => {
    return () => {
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    wordScale.value = 0;
    wordScale.value = withSpring(1, { damping: 9, stiffness: 160 });
  }, [correctCount, wordScale]);

  const finishGame = useCallback(() => {
    if (endedRef.current) {
      return;
    }
    endedRef.current = true;
    shakeX.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
    setFlashColor(hexFor('red'));
    flashOpacity.value = withSequence(withTiming(0.35, { duration: 80 }), withTiming(0, { duration: 350 }));
    endSession();
    showInterstitial(adsRemoved);
    finishTimeoutRef.current = setTimeout(() => {
      router.replace('/result');
    }, RESULT_TRANSITION_DELAY_MS);
  }, [endSession, adsRemoved, shakeX, flashOpacity]);

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

  function handleAnswer(selected: ColorId) {
    if (endedRef.current) {
      return;
    }
    if (selected === round.ink) {
      const nextCorrectCount = correctCount + 1;
      addPoints(POINTS_PER_CORRECT);
      successFeedback();
      playSound('correct');
      setFlashColor(hexFor(round.ink));
      flashOpacity.value = withSequence(withTiming(0.25, { duration: 60 }), withTiming(0, { duration: 250 }));
      setCorrectCount(nextCorrectCount);
      setRound(generateRound());
      setRemainingMs(roundDurationFor(nextCorrectCount));
    } else {
      errorFeedback();
      playSound('wrong');
      finishGame();
    }
  }

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    transform: [{ scale: wordScale.value }],
  }));

  const flashStyle = useAnimatedStyle(
    () => ({
      opacity: flashOpacity.value,
      backgroundColor: flashColor,
    }),
    [flashColor]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.container, shakeStyle]}>
        <TimerBar progress={remainingMs / roundDurationMs} />
        <ScoreBadge label={t('score')} value={score} />
        <View style={styles.wordContainer}>
          <Animated.Text style={[styles.word, { color: hexFor(round.ink) }, wordStyle]}>
            {colorName(round.word)}
          </Animated.Text>
        </View>
        <View style={styles.options}>
          {round.options.map((id, index) => (
            <ColorButton
              key={id}
              colorId={id}
              label={colorName(id)}
              onPress={() => handleAnswer(id)}
              entranceKey={correctCount}
              entranceDelay={index * 40}
            />
          ))}
        </View>
        <Animated.View pointerEvents="none" style={[styles.flashOverlay, flashStyle]} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.background },
  container: { flex: 1, padding: 16 },
  wordContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  word: { fontSize: 48, fontWeight: '900' },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
