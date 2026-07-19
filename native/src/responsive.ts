import { useWindowDimensions } from 'react-native';

export const COMPACT_MAX = 700; // width < this → phone-style single column
export const TWO_COL_MIN = 900; // width ≥ this AND landscape → two columns
export const TABLET_SCALE = 1.25;

export interface Layout {
  width: number;
  height: number;
  isLandscape: boolean;
  compact: boolean;
  roomy: boolean;
  twoCol: boolean;
  maxWidth: number;
  /** Identity on phone (compact); ×1.25 rounded on tablet. */
  scale(base: number): number;
}

export function layoutFor(win: { width: number; height: number }): Layout {
  const { width, height } = win;
  const isLandscape = width > height;
  const compact = width < COMPACT_MAX;
  const roomy = !compact;
  const twoCol = width >= TWO_COL_MIN && isLandscape;
  const maxWidth = compact ? 420 : 640;
  const scale = (base: number) => (compact ? base : Math.round(base * TABLET_SCALE));
  return { width, height, isLandscape, compact, roomy, twoCol, maxWidth, scale };
}

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return layoutFor({ width, height });
}
