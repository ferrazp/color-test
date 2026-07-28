import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { hexFor } from '../lib/colors';
import { THEME } from '../lib/theme';

type Props = {
  progress: number;
};

const URGENT_THRESHOLD = 0.2;
const WARNING_THRESHOLD = 0.5;

function colorForProgress(progress: number): string {
  if (progress > WARNING_THRESHOLD) {
    return hexFor('green');
  }
  if (progress > URGENT_THRESHOLD) {
    return hexFor('yellow');
  }
  return hexFor('red');
}

export function TimerBar({ progress }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const isUrgent = clamped <= URGENT_THRESHOLD;
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isUrgent) {
      pulse.value = withRepeat(withSequence(withTiming(0.45, { duration: 220 }), withTiming(1, { duration: 220 })), -1);
    } else {
      pulse.value = withTiming(1, { duration: 150 });
    }
  }, [isUrgent, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <View style={styles.track}>
      <Animated.View
        style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: colorForProgress(clamped) }, animatedStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 14,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: THEME.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  fill: {
    height: '100%',
  },
});
