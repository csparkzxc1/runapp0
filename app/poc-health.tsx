import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useHealthSnapshot } from '../src/hooks/useHealth';
import { calculateMilestoneRewards } from '../src/lib/macaron';
import { supabase } from '../src/lib/supabase';
import { useUserStore } from '../src/stores/userStore';

interface SyncState {
  todayEarned: number;
  milestones: string[];
  lastSyncedAt: string | null;
  error: string | null;
}

const today = () => new Date().toISOString().split('T')[0];

export default function PoCHealth() {
  const userId = useUserStore((s) => s.userId);
  const setMacaronBalance = useUserStore((s) => s.setMacaronBalance);
  const macaronBalance = useUserStore((s) => s.macaronBalance);

  const health = useHealthSnapshot(!!userId);

  const [sync, setSync] = useState<SyncState>({
    todayEarned: 0,
    milestones: [],
    lastSyncedAt: null,
    error: null,
  });
  const [saving, setSaving] = useState(false);

  const persist = async () => {
    if (!userId || !health.data) return;
    setSaving(true);
    try {
      const { steps, flights, distanceMeters } = health.data;
      const date = today();

      const { data: existing, error: fetchErr } = await supabase
        .from('daily_activity')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_date', date)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      const grantedSoFar: string[] = existing?.milestones_granted ?? [];
      const { earned, newMilestones } = calculateMilestoneRewards(
        { steps, flights },
        grantedSoFar,
      );

      const totalEarned = (existing?.macaron_earned ?? 0) + earned;
      const totalMilestones = [...grantedSoFar, ...newMilestones];
      const previousSteps = existing?.steps ?? 0;
      const stepsDelta = Math.max(0, steps - previousSteps);

      const { error: upsertErr } = await supabase.from('daily_activity').upsert(
        {
          user_id: userId,
          activity_date: date,
          steps,
          flights_climbed: flights,
          distance_meters: distanceMeters,
          macaron_earned: totalEarned,
          milestones_granted: totalMilestones,
        },
        { onConflict: 'user_id,activity_date' },
      );
      if (upsertErr) throw upsertErr;

      if (earned > 0 || stepsDelta > 0) {
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('macaron_balance, lifetime_steps')
          .eq('id', userId)
          .single();
        if (profErr) throw profErr;

        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            macaron_balance: (prof?.macaron_balance ?? 0) + earned,
            lifetime_steps: (prof?.lifetime_steps ?? 0) + stepsDelta,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        if (updateErr) throw updateErr;
      }

      const { data: prof2 } = await supabase
        .from('profiles')
        .select('macaron_balance')
        .eq('id', userId)
        .single();

      setMacaronBalance(prof2?.macaron_balance ?? 0);
      setSync({
        todayEarned: totalEarned,
        milestones: totalMilestones,
        lastSyncedAt: new Date().toLocaleTimeString(),
        error: null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSync((s) => ({ ...s, error: msg }));
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    const result = await health.refetch();
    if (result.data) await persist();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 24 }}>
      <Stack.Screen options={{ title: 'HealthKit PoC' }} />

      <Text style={{ fontSize: 22, fontWeight: 'bold' }}>HealthKit PoC</Text>
      <Text style={{ marginTop: 4, color: '#555' }}>
        User: {userId ? userId.substring(0, 8) : '...'}
      </Text>

      <View
        style={{
          marginTop: 20,
          padding: 16,
          backgroundColor: '#fff5fa',
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: 'bold' }}>
          🍡 {macaronBalance}
        </Text>
        <Text>오늘 적립: +{sync.todayEarned}</Text>
        {sync.lastSyncedAt && (
          <Text style={{ color: '#777', marginTop: 4 }}>
            마지막 동기화: {sync.lastSyncedAt}
          </Text>
        )}
      </View>

      <View style={{ marginTop: 20 }}>
        {health.isLoading && <ActivityIndicator />}
        {health.error && (
          <Text style={{ color: '#b00020' }}>
            HealthKit 에러: {(health.error as Error).message}
          </Text>
        )}
        {health.data && (
          <>
            <Text>걸음: {health.data.steps.toLocaleString()}</Text>
            <Text>계단: {health.data.flights}층</Text>
            <Text>
              거리: {(health.data.distanceMeters / 1000).toFixed(2)}km
            </Text>
          </>
        )}
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={{ fontWeight: 'bold' }}>도달한 마일스톤:</Text>
        {sync.milestones.length === 0 && (
          <Text style={{ color: '#888' }}>없음</Text>
        )}
        {sync.milestones.map((m) => (
          <Text key={m}>✓ {m}</Text>
        ))}
      </View>

      {sync.error && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: '#b00020' }}>Supabase 에러: {sync.error}</Text>
        </View>
      )}

      <View style={{ marginTop: 24, gap: 12 }}>
        <Button
          title={saving ? '저장 중...' : '새로고침 + 적립'}
          onPress={refresh}
          disabled={saving || !userId}
        />
      </View>
    </ScrollView>
  );
}
