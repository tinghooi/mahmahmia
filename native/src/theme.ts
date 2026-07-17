import { ViewStyle } from 'react-native';

export const colors = {
  bg: '#f5f0e8',
  text: '#3d2e1e',
  muted: '#8a7560',
  gold: '#c4873b',
  green: '#2d7d46',
  red: '#c44b3f',
  panel: '#ffffff',
  border: '#dddddd',
  toggleActive: '#8b5e3c',
  banner: '#fff8ee',
  bannerBorder: '#e8d5b8',
  loserBg: '#fde8e8',
  winnerBg: '#e8f5e9',
  faint: '#c4a882',
  divider: '#eeeeee',
  rowDivider: '#f0ebe3',
};

export const panelStyle: ViewStyle = {
  backgroundColor: colors.panel,
  borderRadius: 10,
  padding: 12,
  marginBottom: 16,
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
};
