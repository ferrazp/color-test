import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { THEME } from '../lib/theme';

type Props = {
  label: string;
  value: number;
};

export function ScoreBadge({ label, value }: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(withTiming(1.3, { duration: 120 }), withTiming(1, { duration: 160 }));
  }, [value, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={styles.text}>
        {label}: {value}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  text: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: '800',
  },
});
