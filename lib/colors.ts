export type ColorId = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export type ColorDef = {
  id: ColorId;
  hex: string;
};

export const COLORS: ColorDef[] = [
  { id: 'red', hex: '#E53935' },
  { id: 'blue', hex: '#1E88E5' },
  { id: 'green', hex: '#43A047' },
  { id: 'yellow', hex: '#FDD835' },
  { id: 'purple', hex: '#8E24AA' },
  { id: 'orange', hex: '#FB8C00' },
];

export function hexFor(id: ColorId): string {
  const found = COLORS.find((color) => color.id === id);
  if (!found) {
    throw new Error(`Unknown color id: ${id}`);
  }
  return found.hex;
}
