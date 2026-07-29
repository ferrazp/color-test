import { Platform, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { THEME } from '../lib/theme';
import { tapFeedback } from '../services/haptics';

type Props = {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function IconButton({ icon, onPress, accessibilityLabel, style }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.9, { damping: 12, stiffness: 300 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  }

  function handlePress() {
    tapFeedback();
    onPress();
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.button, style, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.icon}>{icon}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: THEME.border,
    ...Platform.select({
      web: { boxShadow: `3px 3px 0px ${THEME.border}` },
      default: {
        shadowColor: THEME.border,
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3,
      },
    }),
  },
  icon: {
    fontSize: 22,
  },
});
