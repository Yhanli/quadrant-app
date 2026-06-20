import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase config. Copy .env.example to .env and set ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart with `npx expo start -c`.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the session so users stay logged in across restarts.
    // AsyncStorage works on native and maps to localStorage on web.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // On web, parse the OAuth redirect (?code=…) so Google sign-in completes.
    // On native there's no URL to parse.
    detectSessionInUrl: Platform.OS === "web",
  },
});

// Refresh the auth token while the app is foregrounded (native only; the web
// build manages this through the browser tab lifecycle).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
