import { 
  TurnCountTrigger, 
  FactCountTrigger,
  TimedTrigger,
  CompositeTrigger,
  TriggerContext 
} from '../src/sdk/adapters';

const mockContext: TriggerContext = {
  factCount: 5,
  insightCount: 2,
  lastReflectionAt: 0,
  epochNumber: 1,
};

describe('TurnCountTrigger', () => {
  it('does not trigger before threshold', () => {
    const trigger = new TurnCountTrigger(8);
    expect(trigger.shouldTrigger(5, mockContext)).toBe(false);
    expect(trigger.shouldTrigger(7, mockContext)).toBe(false);
  });

  it('triggers at threshold', () => {
    const trigger = new TurnCountTrigger(8);
    expect(trigger.shouldTrigger(8, mockContext)).toBe(true);
  });

  it('triggers after threshold', () => {
    const trigger = new TurnCountTrigger(8);
    expect(trigger.shouldTrigger(10, mockContext)).toBe(true);
  });

  it('describes itself correctly', () => {
    const trigger = new TurnCountTrigger(8);
    expect(trigger.describe()).toContain('8');
  });
});

describe('FactCountTrigger', () => {
  it('triggers when facts exceed threshold', () => {
    const trigger = new FactCountTrigger(5);
    const highContext = { ...mockContext, factCount: 5 };
    expect(trigger.shouldTrigger(1, highContext)).toBe(true);
  });

  it('does not trigger below threshold', () => {
    const trigger = new FactCountTrigger(10);
    expect(trigger.shouldTrigger(1, mockContext)).toBe(false);
  });
});

describe('CompositeTrigger', () => {
  it('triggers when any sub-trigger fires', () => {
    const composite = new CompositeTrigger([
      new TurnCountTrigger(20),
      new FactCountTrigger(5),
    ]);
    expect(composite.shouldTrigger(1, mockContext)).toBe(true);
  });

  it('does not trigger when no sub-trigger fires', () => {
    const composite = new CompositeTrigger([
      new TurnCountTrigger(20),
      new FactCountTrigger(20),
    ]);
    expect(composite.shouldTrigger(1, mockContext)).toBe(false);
  });

  it('describes all sub-triggers', () => {
    const composite = new CompositeTrigger([
      new TurnCountTrigger(8),
      new FactCountTrigger(20),
    ]);
    const desc = composite.describe();
    expect(desc).toContain('8');
    expect(desc).toContain('20');
  });
});
