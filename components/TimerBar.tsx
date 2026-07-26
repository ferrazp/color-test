import { StyleSheet, View } from 'react-native';

type Props = {
  progress: number;
};

export function TimerBar({ progress }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#333',
    overflow: 'hidden',
    marginBottom: 16,
  },
  fill: {
    height: '100%',
    backgroundColor: '#43A047',
  },
});
