import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { ColorId, hexFor } from '../lib/colors';
import { THEME } from '../lib/theme';

type Props = {
  colorId: ColorId;
  label: string;
  onPress: () => void;
  entranceKey?: number;
  entranceDelay?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ColorButton({ colorId, label, onPress, entranceKey = 0, entranceDelay = 0 }: Props) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = 0;
    scale.value = withDelay(entranceDelay, withSpring(1, { damping: 10, stiffness: 180, overshootClamping: true }));
  }, [entranceKey, entranceDelay, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.9, { damping: 12, stiffness: 300 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.button, { backgroundColor: hexFor(colorId) }, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={label}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    width: '47%',
    aspectRatio: 2,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: THEME.border,
    ...Platform.select({
      web: { boxShadow: `4px 4px 0px ${THEME.border}` },
      default: {
        shadowColor: THEME.border,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
      },
    }),
  },
});
