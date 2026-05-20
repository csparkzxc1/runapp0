export type TierLevel =
  | 'tent'
  | 'cabin'
  | 'yard_house'
  | 'villa'
  | 'apartment'
  | 'mansion';

export interface Profile {
  id: string;
  display_name: string | null;
  macaron_balance: number;
  lifetime_steps: number;
  current_tier: TierLevel;
  created_at: string;
  updated_at: string;
}

export interface DailyActivityRow {
  id: number;
  user_id: string;
  activity_date: string;
  steps: number;
  flights_climbed: number;
  distance_meters: number;
  macaron_earned: number;
  milestones_granted: string[];
  ads_watched: number;
  attendance_claimed: boolean;
  source: string;
  created_at: string;
  updated_at: string;
}
