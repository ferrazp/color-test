import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { hexFor } from '../lib/colors';
import { THEME } from '../lib/theme';
import { useSettings } from '../context/SettingsContext';
import { tapFeedback } from '../services/haptics';
import { playSound } from '../services/sound';

type Variant = 'primary' | 'secondary' | 'link';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function BouncyButton({ label, onPress, variant = 'primary', disabled = false }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const { soundEnabled } = useSettings();

  function handlePressIn() {
    scale.value = withSpring(0.92, { damping: 12, stiffness: 300 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  }

  function handlePress() {
    tapFeedback();
    playSound('tap', soundEnabled);
    onPress();
  }

  const textStyle =
    variant === 'primary' ? styles.primaryText : variant === 'secondary' ? styles.secondaryText : styles.linkText;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[styles.base, styles[variant], animatedStyle, disabled ? styles.disabled : null]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={textStyle}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: hexFor('green'),
    borderWidth: 3,
    borderColor: THEME.border,
    paddingVertical: 16,
    paddingHorizontal: 48,
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
  secondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  link: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  primaryText: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textMuted,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textMuted,
  },
});
