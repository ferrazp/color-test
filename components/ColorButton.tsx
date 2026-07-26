import { Pressable, StyleSheet, Text } from 'react-native';
import { ColorId, hexFor } from '../lib/colors';

type Props = {
  colorId: ColorId;
  label: string;
  onPress: () => void;
};

export function ColorButton({ colorId, label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, { backgroundColor: hexFor(colorId) }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '47%',
    aspectRatio: 2,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
