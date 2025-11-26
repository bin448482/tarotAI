import { useFonts } from 'expo-font';
import {
  NotoSerifSC_400Regular,
  NotoSerifSC_700Bold,
} from '@expo-google-fonts/noto-serif-sc';

export function useCustomFonts() {
  const [fontsLoaded, fontError] = useFonts({
    'NotoSerifSC-Regular': NotoSerifSC_400Regular,
    'NotoSerifSC-Bold': NotoSerifSC_700Bold,
  });

  return {
    fontsLoaded,
    fontError,
  };
}