import { useFonts } from 'expo-font';
import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { NotoSerifSC_700Bold, NotoSerifSC_900Black } from '@expo-google-fonts/noto-serif-sc';

export const fontFamily = {
  uiRegular: 'Manrope_400Regular',
  uiMedium: 'Manrope_500Medium',
  uiSemiBold: 'Manrope_600SemiBold',
  uiBold: 'Manrope_700Bold',
  uiExtraBold: 'Manrope_800ExtraBold',
  displaySemiBold: 'Sora_600SemiBold',
  displayBold: 'Sora_700Bold',
  displayExtraBold: 'Sora_800ExtraBold',
  cjkBold: 'NotoSerifSC_700Bold',
  cjkBlack: 'NotoSerifSC_900Black',
} as const;

export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
    Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold,
    NotoSerifSC_700Bold, NotoSerifSC_900Black,
  });
  return loaded;
}
