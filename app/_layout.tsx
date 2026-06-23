import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  useFonts,
} from '@expo-google-fonts/fraunces';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/components/auth-provider';
import { AuthScreen } from '@/components/auth-screen';
import { QuadrantAppProvider } from '@/components/quadrant-dashboard';
import { ScreenBackground } from '@/components/screen-background';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <ScreenBackground />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <QuadrantAppProvider>
      <Stack screenOptions={{ contentStyle: { backgroundColor: '#F4F0E8' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="quadrant/[quadrant]" options={{ headerShown: false }} />
        <Stack.Screen name="values" options={{ headerShown: false }} />
      </Stack>
    </QuadrantAppProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });

  if (!fontsLoaded) {
    return <ScreenBackground />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
