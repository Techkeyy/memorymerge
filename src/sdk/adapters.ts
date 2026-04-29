/**
 * MemoryMerge Plugin Adapter Interfaces
 * 
 * MemoryMerge is a modular framework. Every core component
 * can be swapped by implementing these interfaces.
 * 
 * The 0G implementations are the default/reference adapters.
 * Build your own by implementing any of these interfaces.
 * 
 * @example
 * // Use default 0G adapters
 * const swarm = createSwarm(createZeroGConfig());
 * 
 * // Swap storage adapter
 * const swarm = createSwarm({
 *   ...createZeroGConfig(),
 *   storage: new MyCustomStorageAdapter(),
 * });
 */

// ── Storage Adapter ────────────────────────────────────────────

export interface StorageEntry {
  key: string;
  value: object;
  timestamp: number;
}

/**
 * Storage adapter interface.
 * Implement this to use any storage backend with MemoryMerge.
 * Default implementation: ZeroGStorageAdapter (0G Storage KV + Log)
 */
export interface StorageAdapter {
  /**
   * Write a key-value pair to storage.
   */
  write(key: string, value: object): Promise<string>;

  /**
   * Read a value from storage by key.
   */
  read(key: string): Promise<object | null>;

  /**
   * List all keys matching a prefix.
   */
  list(prefix: string): string[];

  /**
   * Archive a permanent snapshot to the log layer.
   * Returns a root hash or equivalent identifier.
   */
  archive(snapshot: object, label: string): Promise<string>;

  /**
   * Download data by root hash or identifier.
   * Used for cross-swarm knowledge inheritance.
   */
  downloadByHash(hash: string): Promise<object | null>;
}

// ── Compute Adapter ────────────────────────────────────────────

export interface ComputeRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ComputeResponse {
  content: string;
  model: string;
  verified: boolean;
  providerAddress?: string;
}

/**
 * Compute adapter interface.
 * Implement this to use any LLM backend with MemoryMerge.
 * Default implementation: ZeroGComputeAdapter (0G Compute Network)
 */
export interface ComputeAdapter {
  /**
   * Run inference and return a response.
   */
  infer(request: ComputeRequest): Promise<ComputeResponse>;

  /**
   * Get the model name being used.
   */
  getModel(): string;

  /**
   * Whether this adapter provides verified/attested inference.
   */
  isVerified(): boolean;
}

// ── Anchor Adapter ─────────────────────────────────────────────

export interface AnchorRecord {
  hash: string;
  epochNumber: number;
  timestamp: number;
  label: string;
  txHash?: string;
  blockNumber?: number;
}

/**
 * Anchor adapter interface.
 * Implement this to use any anchoring strategy with MemoryMerge.
 * Default implementation: ZeroGChainAnchor (0G Chain MemoryAnchor.sol)
 */
export interface AnchorAdapter {
  /**
   * Anchor a root hash permanently.
   */
  anchor(
    swarmId: string,
    rootHash: string,
    epochNumber: number,
    label: string
  ): Promise<AnchorRecord>;

  /**
   * Get the latest anchored record for a swarm.
   */
  getLatest(swarmId: string): Promise<AnchorRecord | null>;

  /**
   * Get total count of anchored records for a swarm.
   */
  getCount(swarmId: string): Promise<number>;
}

// ── Reflection Trigger Strategy ────────────────────────────────

/**
 * Reflection trigger strategy interface.
 * Implement this to control when reflection fires.
 * Default implementation: TurnCountTrigger
 */
export interface TriggerStrategy {
  /**
   * Called after every agent turn.
   * Return true to trigger reflection.
   */
  shouldTrigger(turnCount: number, context: TriggerContext): boolean;

  /**
   * Reset the trigger state after reflection fires.
   */
  reset(): void;

  /**
   * Human-readable description of this strategy.
   */
  describe(): string;
}

export interface TriggerContext {
  factCount: number;
  insightCount: number;
  lastReflectionAt: number;
  epochNumber: number;
}

// ── Built-in Trigger Strategies ────────────────────────────────

/**
 * Fire reflection every N turns.
 * This is the default strategy.
 */
export class TurnCountTrigger implements TriggerStrategy {
  private lastTriggerAt = 0;

  constructor(private readonly every: number = 8) {}

  shouldTrigger(turnCount: number): boolean {
    return turnCount - this.lastTriggerAt >= this.every;
  }

  reset(): void {
    this.lastTriggerAt = Date.now();
  }

  describe(): string {
    return `Fire every ${this.every} turns`;
  }
}

/**
 * Fire reflection when fact count exceeds a threshold.
 */
export class FactCountTrigger implements TriggerStrategy {
  constructor(private readonly threshold: number = 20) {}

  shouldTrigger(_turnCount: number, context: TriggerContext): boolean {
    return context.factCount >= this.threshold;
  }

  reset(): void {}

  describe(): string {
    return `Fire when facts exceed ${this.threshold}`;
  }
}

/**
 * Fire reflection on a time interval (milliseconds).
 */
export class TimedTrigger implements TriggerStrategy {
  private lastTriggerAt = 0;

  constructor(private readonly intervalMs: number = 300000) {}

  shouldTrigger(): boolean {
    return Date.now() - this.lastTriggerAt >= this.intervalMs;
  }

  reset(): void {
    this.lastTriggerAt = Date.now();
  }

  describe(): string {
    return `Fire every ${this.intervalMs / 1000}s`;
  }
}

/**
 * Combine multiple triggers — fires when ANY trigger returns true.
 */
export class CompositeTrigger implements TriggerStrategy {
  constructor(private readonly triggers: TriggerStrategy[]) {}

  shouldTrigger(turnCount: number, context: TriggerContext): boolean {
    return this.triggers.some(t => t.shouldTrigger(turnCount, context));
  }

  reset(): void {
    this.triggers.forEach(t => t.reset());
  }

  describe(): string {
    return `Composite: [${this.triggers.map(t => t.describe()).join(' | ')}]`;
  }
}

// ── Framework Config ───────────────────────────────────────────

/**
 * Full MemoryMerge framework configuration.
 * Every component is swappable.
 */
export interface MemoryMergeConfig {
  /** Storage backend — defaults to 0G Storage */
  storage: StorageAdapter;

  /** Compute backend — defaults to 0G Compute */
  compute: ComputeAdapter;

  /** Anchoring strategy — defaults to 0G Chain */
  anchor: AnchorAdapter;

  /** When to trigger reflection — defaults to TurnCountTrigger(8) */
  reflectionTrigger: TriggerStrategy;

  /** Swarm identity */
  swarmId: string;

  /** Agent identity */
  agentId: string;
}

// ── 0G Default Config Factory ──────────────────────────────────

/**
 * Create a MemoryMergeConfig using all default 0G adapters.
 * This is the recommended starting point.
 * 
 * @example
 * const config = createZeroGConfig({
 *   swarmId: 'my-swarm',
 *   agentId: 'my-agent',
 * });
 * const memory = new MemoryManager(config);
 */
export function createZeroGConfig(overrides: Partial<MemoryMergeConfig> & {
  swarmId?: string;
  agentId?: string;
} = {}): Omit<MemoryMergeConfig, 'storage' | 'compute' | 'anchor'> & {
  swarmId: string;
  agentId: string;
  reflectionTrigger: TriggerStrategy;
} {
  return {
    swarmId: overrides.swarmId ?? process.env.SWARM_ID ?? 'memorymerge-swarm-001',
    agentId: overrides.agentId ?? 'default-agent',
    reflectionTrigger: overrides.reflectionTrigger ?? new TurnCountTrigger(8),
  };
}