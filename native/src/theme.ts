import { ViewStyle } from 'react-native';

export interface Theme {
  dark: boolean;
  bg: string;
  card: string;
  ink: string;
  mut: string;
  line: string;
  field: string;
  red: string;
  redT: string;
  green: string;
  greenT: string;
  gold: string;
  sub: string;
}

const LIGHT: Theme = {
  dark: false,
  bg: '#F1E8DB', card: '#FFFFFF', ink: '#2B231E', mut: '#93826F', line: 'rgba(0,0,0,0.07)', field: '#FBF8F2',
  red: '#C6412F', redT: '#F9E9E5', green: '#2E7D4F', greenT: '#E7F1EB', gold: '#BE842A', sub: '#B4A38F',
};

const DARK: Theme = {
  dark: true,
  bg: '#17130F', card: '#241E18', ink: '#F3EADD', mut: '#9C8B79', line: 'rgba(255,255,255,0.09)', field: '#1C1712',
  red: '#E67A69', redT: '#3A211C', green: '#63BE8A', greenT: '#1E2E24', gold: '#D8A64E', sub: '#7C6E60',
};

export function getTheme(isDark: boolean): Theme {
  return isDark ? DARK : LIGHT;
}

export function panelStyle(t: Theme): ViewStyle {
  return {
    backgroundColor: t.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: t.line,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}
