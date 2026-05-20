import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { useUserStore } from '../src/stores/userStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function RootLayout() {
  const setUserId = useUserStore((s) => s.setUserId);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          if (!cancelled) setUserId(sessionData.session.user.id);
          return;
        }
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        if (data.user && !cancelled) setUserId(data.user.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setAuthError(msg);
      }
    };

    bootstrap();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [setUserId]);

  if (authError) {
    return (
      <View
        style={{
          flex: 1,
          padding: 24,
          paddingTop: 80,
          backgroundColor: '#fff5fa',
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#b00020' }}>
          Supabase 인증 실패
        </Text>
        <Text style={{ marginTop: 8 }}>{authError}</Text>
        <Text style={{ marginTop: 16, color: '#555' }}>
          .env에 EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY가
          있는지, Supabase Dashboard에서 Anonymous sign-in을 켰는지 확인하세요.
        </Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: true }} />
    </QueryClientProvider>
  );
}
