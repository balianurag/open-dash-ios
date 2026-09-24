import * as Linking from 'expo-linking';
import { DarkTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { LoadingScreen } from '@/src/components';
import { OpenDashProvider, useOpenDash } from '@/src/store';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <OpenDashProvider>
      <RootLayoutNav />
    </OpenDashProvider>
  );
}

function RootLayoutNav() {
  const { ready, palette } = useOpenDash();
  const router = useRouter();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    function open(url: string | null) {
      if (!url) return;
      if (url.startsWith('opendash://') || url.startsWith('opendashios://') || url.includes('exp://')) return;
      router.push({ pathname: '/route', params: { q: url } });
    }
    const sub = Linking.addEventListener('url', ({ url }) => open(url));
    void Linking.getInitialURL().then(open);
    return () => sub.remove();
  }, [router]);

  if (!ready) return <LoadingScreen />;

  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: palette.bg,
      card: palette.surface,
      text: palette.text,
      border: palette.line,
      primary: palette.accent,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={palette.isLight ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="route" options={{ presentation: 'modal' }} />
        <Stack.Screen name="rides" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
