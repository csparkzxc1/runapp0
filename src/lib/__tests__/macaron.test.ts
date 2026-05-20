import {
  calculateMilestoneRewards,
  DAILY_AD_LIMIT,
  FLIGHT_MILESTONES,
  STEP_MILESTONES,
} from '../macaron';

describe('calculateMilestoneRewards', () => {
  describe('step milestones (cold start, no granted)', () => {
    it('grants nothing at zero', () => {
      expect(calculateMilestoneRewards({ steps: 0, flights: 0 }, [])).toEqual({
        earned: 0,
        newMilestones: [],
      });
    });

    it('grants nothing just below 1000', () => {
      expect(calculateMilestoneRewards({ steps: 999, flights: 0 }, [])).toEqual(
        { earned: 0, newMilestones: [] },
      );
    });

    it('grants 1 at exactly 1000 steps', () => {
      expect(
        calculateMilestoneRewards({ steps: 1000, flights: 0 }, []),
      ).toEqual({ earned: 1, newMilestones: ['steps_1000'] });
    });

    it('grants 1+2=3 at 5000 (both 1k and 5k together)', () => {
      const r = calculateMilestoneRewards({ steps: 5000, flights: 0 }, []);
      expect(r.earned).toBe(3);
      expect(r.newMilestones.sort()).toEqual(['steps_1000', 'steps_5000']);
    });

    it('grants 1+2+5=8 at 10000', () => {
      const r = calculateMilestoneRewards({ steps: 10000, flights: 0 }, []);
      expect(r.earned).toBe(8);
      expect(new Set(r.newMilestones)).toEqual(
        new Set(['steps_1000', 'steps_5000', 'steps_10000']),
      );
    });
  });

  describe('flight milestones', () => {
    it('grants 1 at 10 flights', () => {
      expect(calculateMilestoneRewards({ steps: 0, flights: 10 }, [])).toEqual({
        earned: 1,
        newMilestones: ['flights_10'],
      });
    });

    it('grants nothing at 9 flights', () => {
      expect(calculateMilestoneRewards({ steps: 0, flights: 9 }, [])).toEqual({
        earned: 0,
        newMilestones: [],
      });
    });
  });

  describe('idempotency / dedup', () => {
    it('does NOT re-grant a milestone that was already granted', () => {
      const r = calculateMilestoneRewards({ steps: 10000, flights: 0 }, [
        'steps_1000',
      ]);
      expect(r.earned).toBe(7); // 2 (5k) + 5 (10k)
      expect(new Set(r.newMilestones)).toEqual(
        new Set(['steps_5000', 'steps_10000']),
      );
    });

    it('grants nothing when all step milestones already granted', () => {
      const r = calculateMilestoneRewards({ steps: 50000, flights: 0 }, [
        'steps_1000',
        'steps_5000',
        'steps_10000',
      ]);
      expect(r).toEqual({ earned: 0, newMilestones: [] });
    });

    it('full-day fresh: steps 1k+5k+10k + flights 10 = 9 macaron', () => {
      const r = calculateMilestoneRewards({ steps: 12000, flights: 20 }, []);
      expect(r.earned).toBe(9);
      expect(new Set(r.newMilestones)).toEqual(
        new Set(['steps_1000', 'steps_5000', 'steps_10000', 'flights_10']),
      );
    });

    it('full-day re-sync: all milestones already granted, no double credit', () => {
      const r = calculateMilestoneRewards({ steps: 12000, flights: 20 }, [
        'steps_1000',
        'steps_5000',
        'steps_10000',
        'flights_10',
      ]);
      expect(r).toEqual({ earned: 0, newMilestones: [] });
    });
  });

  describe('regression: steps go down (data refresh anomaly)', () => {
    it('does not award negative or re-award if step count momentarily decreases', () => {
      // First call awards 1k milestone
      const first = calculateMilestoneRewards({ steps: 1500, flights: 0 }, []);
      expect(first.earned).toBe(1);

      // Later call with lower step count (e.g. HealthKit cache glitch) but
      // milestone already granted -> no re-grant, no negative.
      const second = calculateMilestoneRewards(
        { steps: 900, flights: 0 },
        first.newMilestones,
      );
      expect(second.earned).toBe(0);
      expect(second.newMilestones).toEqual([]);
    });
  });
});

describe('milestone configuration', () => {
  it('STEP_MILESTONES is ordered ascending by threshold', () => {
    for (let i = 1; i < STEP_MILESTONES.length; i++) {
      expect(STEP_MILESTONES[i].threshold).toBeGreaterThan(
        STEP_MILESTONES[i - 1].threshold,
      );
    }
  });

  it('all milestone keys are unique', () => {
    const keys = [
      ...STEP_MILESTONES.map((m) => m.key),
      ...FLIGHT_MILESTONES.map((m) => m.key),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('heavy-user theoretical max (no ads) = 9 from milestones + 1 attendance + 10 ads = 20', () => {
    const milestoneMax =
      STEP_MILESTONES.reduce((s, m) => s + m.reward, 0) +
      FLIGHT_MILESTONES.reduce((s, m) => s + m.reward, 0);
    const attendance = 1;
    const adsMax = DAILY_AD_LIMIT * 1;
    expect(milestoneMax + attendance + adsMax).toBe(20);
  });
});
