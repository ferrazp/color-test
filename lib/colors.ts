export type ColorId = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export type ColorDef = {
  id: ColorId;
  hex: string;
};

export const COLORS: ColorDef[] = [
  { id: 'red', hex: '#FF4B5C' },
  { id: 'blue', hex: '#2F8FFF' },
  { id: 'green', hex: '#2ED573' },
  { id: 'yellow', hex: '#FFD23F' },
  { id: 'purple', hex: '#8C54FF' },
  { id: 'orange', hex: '#FF8C42' },
];

export function hexFor(id: ColorId): string {
  const found = COLORS.find((color) => color.id === id);
  if (!found) {
    throw new Error(`Unknown color id: ${id}`);
  }
  return found.hex;
}
