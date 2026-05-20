// 마카롱 적립 규칙 (v2):
// 출석: 1 (Phase 1+ 구현, 여기선 자리만)
// 1000보 도달: 1 (1회/일)
// 5000보 도달: 2 (1회/일)
// 10000보 도달: 5 (1회/일)
// 10층 도달: 1 (1회/일)
// 광고 시청: 1 (1회당, 최대 10회/일, Phase 1+ 구현)

export const DAILY_AD_LIMIT = 10;

export const STEP_MILESTONES = [
  { key: 'steps_1000', threshold: 1000, reward: 1 },
  { key: 'steps_5000', threshold: 5000, reward: 2 },
  { key: 'steps_10000', threshold: 10000, reward: 5 },
] as const;

export const FLIGHT_MILESTONES = [
  { key: 'flights_10', threshold: 10, reward: 1 },
] as const;

export interface DailyActivity {
  steps: number;
  flights: number;
}

export interface MilestoneResult {
  earned: number;
  newMilestones: string[];
}

/**
 * 마일스톤 도달 시 1회/일 보상.
 * 이미 grantedMilestones에 있는 마일스톤은 중복 적립 안 함.
 */
export function calculateMilestoneRewards(
  activity: DailyActivity,
  grantedMilestones: string[],
): MilestoneResult {
  let earned = 0;
  const newMilestones: string[] = [];

  for (const m of STEP_MILESTONES) {
    if (activity.steps >= m.threshold && !grantedMilestones.includes(m.key)) {
      earned += m.reward;
      newMilestones.push(m.key);
    }
  }

  for (const m of FLIGHT_MILESTONES) {
    if (activity.flights >= m.threshold && !grantedMilestones.includes(m.key)) {
      earned += m.reward;
      newMilestones.push(m.key);
    }
  }

  return { earned, newMilestones };
}

// 헤비 유저 일일 최대치 = 출석 1 + 1000보 1 + 5000보 2 + 10000보 5 + 10층 1 + 광고 10 = 20
