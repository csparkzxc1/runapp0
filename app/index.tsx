import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { useUserStore } from '../src/stores/userStore';

export default function Home() {
  const userId = useUserStore((s) => s.userId);
  const macaronBalance = useUserStore((s) => s.macaronBalance);

  return (
    <View style={{ flex: 1, padding: 20, paddingTop: 40 }}>
      <Stack.Screen options={{ title: '마카롱' }} />
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>마카롱 (Phase 0)</Text>
      <Text style={{ marginTop: 8, color: '#555' }}>
        User: {userId ? userId.substring(0, 8) : '로그인 중...'}
      </Text>

      <View
        style={{
          marginTop: 24,
          padding: 16,
          backgroundColor: '#fff5fa',
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: 32, fontWeight: 'bold' }}>
          🍡 {macaronBalance}
        </Text>
        <Text style={{ color: '#666' }}>현재 마카롱 잔액 (캐시)</Text>
      </View>

      <View style={{ marginTop: 32 }}>
        <Link
          href="/poc-health"
          style={{
            fontSize: 16,
            color: '#1a73e8',
            paddingVertical: 12,
          }}
        >
          → HealthKit + 적립 PoC 화면 열기
        </Link>
      </View>
    </View>
  );
}
