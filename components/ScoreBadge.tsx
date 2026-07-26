import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value: number;
};

export function ScoreBadge({ label, value }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {label}: {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
