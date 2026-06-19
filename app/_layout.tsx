import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/components/auth-provider';
import { AuthScreen } from '@/components/auth-screen';
import { QuadrantAppProvider } from '@/components/quadrant-dashboard';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  initialRouteName: 'index',
};

function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6F3' }}>
        <ActivityIndicator color="#556B4D" />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <QuadrantAppProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="quadrant/[quadrant]" options={{ headerShown: false }} />
        <Stack.Screen name="insights" options={{ headerShown: false }} />
      </Stack>
    </QuadrantAppProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
