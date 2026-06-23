import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  useFonts,
} from '@expo-google-fonts/fraunces';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
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
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#556B4D" />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <QuadrantAppProvider>
      <Stack screenOptions={{ contentStyle: { backgroundColor: 'transparent' } }}>
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

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* One warm gradient behind every screen; screens render transparent. */}
      <ScreenBackground>
        {fontsLoaded ? (
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#556B4D" />
          </View>
        )}
      </ScreenBackground>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
